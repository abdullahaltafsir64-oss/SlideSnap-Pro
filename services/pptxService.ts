
import JSZip from 'jszip';
import * as htmlToImage from 'html-to-image';
import { DocumentPage } from '../types';

export const convertPptxToImages = async (
  file: File,
  onProgress?: (progress: number) => void
): Promise<DocumentPage[]> => {
  const zip = await JSZip.loadAsync(file);
  const emuToPx = 96 / 914400;

  const slideFiles = Object.keys(zip.files)
    .filter(name => name.startsWith('ppt/slides/slide') && name.endsWith('.xml'))
    .sort((a, b) => {
        const aNum = parseInt(a.match(/\d+/)![0]);
        const bNum = parseInt(b.match(/\d+/)![0]);
        return aNum - bNum;
    });
  
  const vault = document.getElementById('render-vault');
  if (!vault) throw new Error('Render vault not found');

  const pages: DocumentPage[] = [];
  const parser = new DOMParser();

  // Helper to render shapes from an XML doc (Slide or Layout)
  const renderShapesToContainer = async (xmlDoc: Document, container: HTMLElement, relMap: Record<string, string>) => {
    // Detect Background
    const bg = xmlDoc.getElementsByTagName("p:bg")[0];
    if (bg) {
      const srgbClr = bg.getElementsByTagName("a:srgbClr")[0];
      if (srgbClr) container.style.backgroundColor = `#${srgbClr.getAttribute('val')}`;
    }

    // Process all shapes (p:sp, p:pic, p:graphicFrame)
    const allShapes = Array.from(xmlDoc.querySelectorAll("p\\:sp, sp, p\\:pic, pic, p\\:graphicFrame, graphicFrame"));

    for (const shape of allShapes) {
      const off = shape.getElementsByTagName("a:off")[0];
      const ext = shape.getElementsByTagName("a:ext")[0];

      if (off && ext) {
        const x = parseInt(off.getAttribute('x') || '0') * emuToPx;
        const y = parseInt(off.getAttribute('y') || '0') * emuToPx;
        const w = parseInt(ext.getAttribute('cx') || '0') * emuToPx;
        const h = parseInt(ext.getAttribute('cy') || '0') * emuToPx;

        const shapeDiv = document.createElement('div');
        shapeDiv.className = 'pptx-shape';
        shapeDiv.style.left = `${x}px`;
        shapeDiv.style.top = `${y}px`;
        shapeDiv.style.width = `${w}px`;
        shapeDiv.style.height = `${h}px`;

        // Handle Background Fills (for the green bars)
        const spPr = shape.getElementsByTagName("p:spPr")[0] || shape.getElementsByTagName("p:spPr")[0];
        if (spPr) {
            const solidFill = spPr.getElementsByTagName("a:solidFill")[0];
            if (solidFill) {
                const srgbClr = solidFill.getElementsByTagName("a:srgbClr")[0];
                if (srgbClr) shapeDiv.style.backgroundColor = `#${srgbClr.getAttribute('val')}`;
            }
        }

        // Handle Text
        const txBody = shape.getElementsByTagName("p:txBody")[0];
        if (txBody) {
          const paragraphs = txBody.getElementsByTagName("a:p");
          Array.from(paragraphs).forEach(p => {
            const pEl = document.createElement('p');
            const runs = p.getElementsByTagName("a:r");
            Array.from(runs).forEach(r => {
              const text = r.getElementsByTagName("a:t")[0]?.textContent;
              if (text) {
                const span = document.createElement('span');
                span.textContent = text;
                // Basic styles
                const rPr = r.getElementsByTagName("a:rPr")[0];
                if (rPr) {
                  const sz = rPr.getAttribute('sz');
                  if (sz) span.style.fontSize = `${parseInt(sz)/100}pt`;
                  if (rPr.getAttribute('b') === '1') span.style.fontWeight = '700';
                  const clr = rPr.getElementsByTagName("a:srgbClr")[0];
                  if (clr) span.style.color = `#${clr.getAttribute('val')}`;
                }
                pEl.appendChild(span);
              }
            });
            shapeDiv.appendChild(pEl);
          });
        }

        // Handle Images
        const blip = shape.getElementsByTagName("a:blip")[0];
        if (blip) {
          const rId = blip.getAttribute("r:embed");
          const imagePath = rId ? relMap[rId] : null;
          if (imagePath) {
            const imgData = await zip.file(imagePath)?.async('base64');
            if (imgData) {
              const img = document.createElement('img');
              img.src = `data:image/png;base64,${imgData}`;
              img.style.width = '100%';
              img.style.height = '100%';
              img.style.objectFit = 'contain';
              shapeDiv.appendChild(img);
            }
          }
        }

        container.appendChild(shapeDiv);
      }
    }
  };

  for (let i = 0; i < slideFiles.length; i++) {
    const slidePath = slideFiles[i];
    const slideName = slidePath.split('/').pop();
    const relsPath = `ppt/slides/_rels/${slideName}.rels`;
    
    const slideXmlStr = await zip.file(slidePath)?.async('string');
    const relsXmlStr = await zip.file(relsPath)?.async('string');
    if (!slideXmlStr) continue;

    const slideDoc = parser.parseFromString(slideXmlStr, "text/xml");
    const relsDoc = relsXmlStr ? parser.parseFromString(relsXmlStr, "text/xml") : null;

    // Resolve Relationships
    const relMap: Record<string, string> = {};
    let layoutPath = '';
    if (relsDoc) {
      const rels = relsDoc.getElementsByTagName("Relationship");
      Array.from(rels).forEach(rel => {
        const id = rel.getAttribute("Id")!;
        const target = rel.getAttribute("Target")!;
        const type = rel.getAttribute("Type")!;
        if (type.includes('slideLayout')) {
            layoutPath = target.replace('../', 'ppt/');
        }
        relMap[id] = target.replace('../', 'ppt/');
      });
    }

    vault.innerHTML = '';
    const slideContainer = document.createElement('div');
    slideContainer.className = 'fidelity-page pptx-slide';

    // 1. Render Layout (Background elements)
    if (layoutPath) {
        const layoutXmlStr = await zip.file(layoutPath)?.async('string');
        const layoutRelsPath = `ppt/slideLayouts/_rels/${layoutPath.split('/').pop()}.rels`;
        const layoutRelsStr = await zip.file(layoutRelsPath)?.async('string');
        
        if (layoutXmlStr) {
            const layoutDoc = parser.parseFromString(layoutXmlStr, "text/xml");
            const layoutRelMap: Record<string, string> = {};
            if (layoutRelsStr) {
                const lRelsDoc = parser.parseFromString(layoutRelsStr, "text/xml");
                Array.from(lRelsDoc.getElementsByTagName("Relationship")).forEach(rel => {
                    layoutRelMap[rel.getAttribute("Id")!] = rel.getAttribute("Target")!.replace('../', 'ppt/');
                });
            }
            await renderShapesToContainer(layoutDoc, slideContainer, layoutRelMap);
        }
    }

    // 2. Render Slide content (Foreground)
    await renderShapesToContainer(slideDoc, slideContainer, relMap);

    vault.appendChild(slideContainer);

    const dataUrl = await htmlToImage.toPng(slideContainer, { 
        pixelRatio: 4, 
        backgroundColor: '#ffffff',
        cacheBust: true
    });
    const blob = await (await fetch(dataUrl)).blob();

    pages.push({ index: i + 1, dataUrl, blob, width: 1280 * 4, height: 720 * 4 });
    
    if (onProgress) {
        onProgress(Math.round(((i + 1) / slideFiles.length) * 100));
    }
  }

  return pages;
};
