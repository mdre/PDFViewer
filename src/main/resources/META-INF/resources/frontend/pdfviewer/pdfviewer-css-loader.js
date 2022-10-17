import styles from '@vaadin/flow-frontend/pdfviewer/pdfviewer.css';

const $_documentContainer = document.createElement('template');

$_documentContainer.innerHTML = `
  <dom-module id="pdf-viewer-css" theme-for="pdf-viewer">
    <template><style>${styles}</style></template>
  </dom-module>`;
document.head.appendChild($_documentContainer.content);