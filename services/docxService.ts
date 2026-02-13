
import * as htmlToImage from 'html-to-image';
import { DocumentPage } from '../types';

// docx-preview is loaded via CDN script tag in index.html
declare const docx: any;

export const convertDocxToImages = async (file: File): Promise<DocumentPage[]> => {
  const arrayBuffer = await file.arrayBuffer();
  
  const vault = document.getElementById('render-vault');
  if (!vault) throw new Error('Render vault not found');

  vault.innerHTML = '';
  const container = document.createElement('div');
  container.className = 'fidelity-page docx-paper';
  vault.appendChild(container);

  // Use docx-preview for layout-perfect rendering
  await docx.renderAsync(arrayBuffer, container, container, {
      className: "docx-render",
      inWrapper: false,
      ignoreLastRenderedPageBreak: false
  });

  // Small delay to ensure styles and images are fully processed
  await new Promise(resolve => setTimeout(resolve, 800)); // Slightly longer delay for high-res rendering

  const dataUrl = await htmlToImage.toPng(container, { 
    pixelRatio: 4, // Increased to 4 for professional high-resolution
    backgroundColor: '#ffffff',
    cacheBust: true
  });
  
  const blob = await (await fetch(dataUrl)).blob();

  return [{
    index: 1,
    dataUrl,
    blob,
    width: container.offsetWidth * 4,
    height: container.offsetHeight * 4
  }];
};
