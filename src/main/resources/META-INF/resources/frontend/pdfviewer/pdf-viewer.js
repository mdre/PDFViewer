import { PolymerElement, html } from '@polymer/polymer/polymer-element.js';
import { ThemableMixin } from '@vaadin/vaadin-themable-mixin/vaadin-themable-mixin.js';

//import { pdfjsLib } from 'pdfjs-dist/build/pdf.min.js';
import 'pdfjs-dist/build/pdf.worker.js';
import {pdfjsWorker2} from "pdfjs-dist/build/pdf.worker.entry";

import "@vaadin/flow-frontend/pdfviewer/pdfviewer-css-loader.js";


/**
 * `PDF-Viewer`
 * A PDF Viewer component
 *
 * @customElement
 * @polymer
 */
class PDFViewer extends ThemableMixin(PolymerElement) {
    static get template() {
        return html `
        <style>
        </style> 
        
        <div class="pdfviewer-outer-div">
            <div id="navbar" class="navbar">
                <div id="prev" class="navbutton" on-click="previous"> &lt; </div>
                <div id="pages" class="pages">
                    <div id="pagenum" class="pagenum"></div> / <div id="pagecount"></div>
                </div>
                <div id="next" class="navbutton" on-click="next"> &gt; </div>  
            </div>
            <div class="viewer">
                <canvas id="canvas" class="canvas"></canvas>
                <canvas id="canvasSello" 
                        class="canvasSello"
                        on-mousedown="beginDrag"
                        on-mousemove="mouseMove"
                        on-mouseup="mouseUp"></canvas>
            </div>
        </div>

        `;
    }

    static get is() {
        return 'pdf-viewer';
    }

    static get properties() {
        return {
            targetid: {
                type: String,
                value: ''
            }
        };
    }

    log(...logVal) {
        if (this.logEnabled) {
            console.log(...logVal);
        }
    }

    constructor() {
        super();

        this.logEnabled = false;

        this.log("\n\nPDFViewer\n\n");
        
        this.viewport = 'undefined';
        this.embedImagePromise = {};
        this.imgDict = {};
        // escala de conversión de pixels a points para insertar en los pdfs
        this.px2ptScale = 0.75;
        this.imageScale = 1;

        // última posición del mouse.
        this.lastPosX = null;
        this.lastPosY = null;

        this.pageToView = 1;
        
        this.loadPDFJS();
        
        this.log("constructor end! \n\n\n");
        //pdfjs.GlobalWorkerOptions.workerPort = new PdfjsWorker();
        //this.log("w2", worker);
    }

    loadPDFJS() {
        // FIX para el PDFJS. De la forma tradicional no funcionaba.
        this.log("\n\nloading PDFJS....");
        
        this.pdfjsLoad = import ('pdfjs-dist/legacy/build/pdf');

        this.pdfjsWorkerLoad = import ('pdfjs-dist/legacy/build/pdf.worker.entry');

        this.pdfjsLoad.then((pdfL)=>{
            this.pdfjs = pdfL;
        
            this.pdfjsWorkerLoad.then((pdfWL)=>{
                this.pdfjsWorker = pdfWL;
                
                this.pdfjs.GlobalWorkerOptions.workerSrc = this.pdfjsWorker;
            
                this.log("\n\n\nLoad END!!!");
                this.log("PDFJS: ", this.pdfjs);
                this.log("PdfjsWorker: ", this.pdfjsWorker);
            });
        });
        
    }

    
    load(tURL) {
        this.log(tURL);
        this.targetURL = tURL;
        this.internalLoad();
        
    }
    

    internalLoad() {

        const url = this.targetURL;
        this.pdfjsLoad.then(()=>{
            var loadingTask = this.pdfjs.getDocument(url);
            loadingTask.promise.then((pdf) => {
                this.pdf = pdf;
                
                this.viewPage(1);
                
                this.log("page count: ",this.pdf.numPages);
                this.$.pagecount.textContent = this.pdf.numPages;
                this.updateNavbar();
                this.$server.setPageCount(this.pdf.numPages);
            });
        });
        
    }

    viewPage(page) {
        this.pageToView = page;
        
        // you can now use *pdf* here
        this.pdf.getPage(this.pageToView).then((page) => {
            this.log("page: ", page);
            // you can now use *page* here
            var scale = 1;
            this.viewport = page.getViewport({ scale: scale, });
            // Support HiDPI-screens.
            this.outputScale = window.devicePixelRatio || 1;
            this.log("outputScale:", this.outputScale);

            this.log("canvas: ", this.$.canvas);
            //var canvas = this.$.canvas;
            //var canvasSello = this.$.canvasSello;

            var context = this.$.canvas.getContext('2d');

            this.$.canvas.width = Math.floor(this.viewport.width * this.outputScale);
            this.$.canvas.height = Math.floor(this.viewport.height * this.outputScale);
            this.$.canvas.style.width = Math.floor(this.viewport.width) + "px";
            this.$.canvas.style.height = Math.floor(this.viewport.height) + "px";

            this.$.canvasSello.width = this.$.canvas.width;
            this.$.canvasSello.height = this.$.canvas.height;
            this.$.canvasSello.style.width = this.$.canvas.style.width;
            this.$.canvasSello.style.height = this.$.canvas.style.height;


            var transform = this.outputScale !== 1 ? [this.outputScale, 0, 0, this.outputScale, 0, 0] :
                null;

            //this.$.canvasSello.getContext("2d").transform(transform);

            var renderContext = {
                canvasContext: context,
                transform: transform,
                viewport: this.viewport
            };
            page.render(renderContext);
             if (typeof this.img !== 'undefined') {
                this._drawImage();
            }
        });

    }

    setImageCoords(x,y){
        this.imgX = x;
        this.imgY = y;
        this._drawImage();
    }

    setImageScale(e) {
        this.imageScale = e;
        this._drawImage(this.img);
    }

    removeImage() {
        this.img = void 0;  // establecer la variable como undefined
        
        var canvas = this.$.canvasSello;
        var context = canvas.getContext("2d");

        context.clearRect(0, 0, canvas.width, canvas.height);
    }
    
    async drawImage(imageName, imageUrl) {
        this.log("\n\nDrawImage\n\n");
        this.log(imageName, imageUrl);
        this.img = new Image();
        await new Promise(r => this.img.onload = r, this.img.src = imageUrl).then(()=>{
            // this.imgX = this.$.canvasSello.width / 2 - this.img.width / 2;
            // this.imgY = this.$.canvasSello.height / 2 - this.img.height / 2;
            this.imgX = this.imgX === 0 ? 50 : this.imgX;
            this.imgY = this.imgY === 0 ? 50 : this.imgY;
            this._drawImage();
        });

    }

    _drawImage() {
        var canvas = this.$.canvasSello;
        var context = canvas.getContext("2d");

        context.clearRect(0, 0, canvas.width, canvas.height);

        // dibuja las líneas para debug de coordenadas
//        for (let y = 50; y < canvas.height; y += 50) {
//
//            context.beginPath();
//            context.lineWidth = "1";
//            context.strokeStyle = "black"; // Green path
//            context.moveTo(0, y);
//            context.lineTo(canvas.width, y);
//            context.stroke(); // Draw it
//
//            context.strokeText("" + y, 0, y);
//        }

        this.log("Imagen: ", this.imgX, this.imgY, this.img.width * this.imageScale, this.img.height * this.imageScale);
        context.drawImage(this.img, this.imgX, this.imgY, this.img.width * this.imageScale, this.img.height * this.imageScale);
        // draw rectangular region for image
        this.log("Crear path: ", this.imgX, this.imgY, this.img.width * this.imageScale, this.img.height * this.imageScale);
        context.beginPath();

        context.strokeRect(this.imgX, this.imgY, this.img.width * this.imageScale, this.img.height * this.imageScale);
        context.rect(this.imgX, this.imgY, this.img.width * this.imageScale, this.img.height * this.imageScale);
        context.closePath();

        var pdfPoint = this.viewport.convertToPdfPoint(this.imgX / this.outputScale, (this.imgY + (this.img.height * this.imageScale)) / this.outputScale);
        this.log("Point: ", pdfPoint);
        this.log("Coords canvas:", this.imgX, this.imgY);
        this.log("Coords convertToPdfPoint:", pdfPoint[0], pdfPoint[1]);
        this.log("Coords calculadas:", this.imgX / this.outputScale, (this.$.canvasSello.height - this.imgY - (this.img.height * this.imageScale)) / (this.img.height * this.imageScale));
        //this.$server.setImageCoords(this.imgX, this.$.canvasSello.height - this.imgY - (this.img.height * this.imageScale));
        this.$server._setPDFImageCoords(pdfPoint[0], pdfPoint[1]);
    }

    beginDrag(evt) {
        if (typeof this.img !== 'undefined') {
            this.log("beginDrag", evt);
            this.dragging = true;
        }
    }

    mouseMove(evt) {
        if (this.dragging) {
            this.log("mouseMove", evt);
            var rect = this.$.canvasSello.getBoundingClientRect();

            this.imgX = (evt.clientX - rect.left) / (rect.right - rect.left) * this.$.canvasSello.width;
            this.imgY = (evt.clientY - rect.top) / (rect.bottom - rect.top) * this.$.canvasSello.height;

            this.log("BCR: ", this.$.canvasSello.getBoundingClientRect());
            this.log("evt:", evt.clientX, evt.clientY, "canvasPos:", rect.left, rect.top, "img:", this.imgX, this.imgY);

            var pdfPoint = this._drawImage();
            // retornar las coordenadas calculadas por el canvas
            this.$server._setImageCoords(this.imgX, this.imgY);
        }
    }

    mouseUp(evt) {
        this.log("mouseUp!");
        this.dragging = false;
    }

    getCanvasPos() {
        let obj = this.$.canvasSello;
        let top = 0;
        let left = 0;
        while (obj.offsetParent != null) {
            top += obj.offsetTop;
            left += obj.offsetLeft;
            obj = obj.offsetParent;
        }
        return {
            top: top,
            left: left
        };
    }

    previous() {
        if (typeof this.pdf !== 'undefined') {
            if (this.pageToView > 1) {
                this.pageToView--;
                this.viewPage(this.pageToView);
                this.updateNavbar();
            }
        }
    }

    next() {
        if (typeof this.pdf !== 'undefined') {
            if (this.pageToView < this.pdf.numPages) {
                this.pageToView++;
                this.viewPage(this.pageToView);
                this.updateNavbar();
            }
        }
    }

    updateNavbar() {
        this.$server.setCurrentPage(this.pageToView);
        this.$.pagenum.textContent = this.pageToView;
    }

}

customElements.define(PDFViewer.is, PDFViewer);



class Events {
    constructor(canvasId) {
        this.canvas = canvasId;
        this.context = this.canvas.getContext("2d");
        this.drawStage = undefined;
        this.listening = false;

        // desktop flags
        this.mousePos = null;
        this.mouseDown = false;
        this.mouseUp = false;
        this.mouseOver = false;
        this.mouseMove = false;

        // mobile flags
        this.touchPos = null;
        this.touchStart = false;
        this.touchMove = false;
        this.touchEnd = false;

        // Region Events
        this.currentRegion = null;
        this.regionIndex = 0;
        this.lastRegionIndex = -1;
        this.mouseOverRegionIndex = -1;
    }

    getContext() {
        return this.context;
    }

    getCanvas() {
        return this.canvas;
    }

    clear() {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    getCanvasPos() {
        let obj = this.getCanvas();
        let top = 0;
        let left = 0;
        while (obj.tagName != "BODY") {
            top += obj.offsetTop;
            left += obj.offsetLeft;
            obj = obj.offsetParent;
        }
        return {
            top: top,
            left: left
        };
    }

    setDrawStage(func) {
        this.drawStage = func;
        this.listen();
    }

    reset(evt) {
        if (!evt) {
            evt = window.event;
        }

        this.setMousePosition(evt);
        this.setTouchPosition(evt);
        this.regionIndex = 0;

        if (!this.animating && this.drawStage !== undefined) {
            this.drawStage();
        }

        // desktop flags
        this.mouseOver = false;
        this.mouseMove = false;
        this.mouseDown = false;
        this.mouseUp = false;

        // mobile touch flags
        this.touchStart = false;
        this.touchMove = false;
        this.touchEnd = false;
    }

    listen() {
        const that = this;

        if (this.drawStage !== undefined) {
            this.drawStage();
        }

        // desktop events
        this.canvas.addEventListener("mousedown", evt => {
            that.mouseDown = true;
            that.reset(evt);
        }, false);

        this.canvas.addEventListener("mousemove", evt => {
            that.reset(evt);
        }, false);

        this.canvas.addEventListener("mouseup", evt => {
            that.mouseUp = true;
            that.reset(evt);
        }, false);

        this.canvas.addEventListener("mouseover", evt => {
            that.reset(evt);
        }, false);

        this.canvas.addEventListener("mouseout", evt => {
            that.mousePos = null;
        }, false);

        // mobile events
        this.canvas.addEventListener("touchstart", evt => {
            evt.preventDefault();
            that.touchStart = true;
            that.reset(evt);
        }, false);

        this.canvas.addEventListener("touchmove", evt => {
            evt.preventDefault();
            that.reset(evt);
        }, false);

        this.canvas.addEventListener("touchend", evt => {
            evt.preventDefault();
            that.touchEnd = true;
            that.reset(evt);
        }, false);
    }

    getMousePos(evt) {
        return this.mousePos;
    }

    getTouchPos(evt) {
        return this.touchPos;
    }

    setMousePosition(evt) {
        const mouseX = evt.clientX - this.getCanvasPos().left + window.pageXOffset;
        const mouseY = evt.clientY - this.getCanvasPos().top + window.pageYOffset;
        this.mousePos = {
            x: mouseX,
            y: mouseY
        };
    }

    setTouchPosition(evt) {
        if (evt.touches !== undefined && evt.touches.length == 1) { // Only deal with one finger
            const touch = evt.touches[0]; // Get the information for finger #1
            const touchX = touch.pageX - this.getCanvasPos().left + window.pageXOffset;
            const touchY = touch.pageY - this.getCanvasPos().top + window.pageYOffset;

            this.touchPos = {
                x: touchX,
                y: touchY
            };
        }
    }

    beginRegion() {
        this.currentRegion = {};
        this.regionIndex++;
    }

    addRegionEventListener(type, func) {
        let event = (type.indexOf('touch') == -1) ? `on${type}` : type;
        this.currentRegion[event] = func;
    }

    closeRegion() {
        const pos = this.touchPos || this.mousePos;

        if (pos !== null && this.context.isPointInPath(pos.x, pos.y)) {
            if (this.lastRegionIndex != this.regionIndex) {
                this.lastRegionIndex = this.regionIndex;
            }

            // handle onmousedown
            if (this.mouseDown && this.currentRegion.onmousedown !== undefined) {
                this.currentRegion.onmousedown();
                this.mouseDown = false;
            }

            // handle onmouseup
            else if (this.mouseUp && this.currentRegion.onmouseup !== undefined) {
                this.currentRegion.onmouseup();
                this.mouseUp = false;
            }

            // handle onmouseover
            else if (!this.mouseOver && this.regionIndex != this.mouseOverRegionIndex && this.currentRegion.onmouseover !== undefined) {
                this.currentRegion.onmouseover();
                this.mouseOver = true;
                this.mouseOverRegionIndex = this.regionIndex;
            }

            // handle onmousemove
            else if (!this.mouseMove && this.currentRegion.onmousemove !== undefined) {
                this.currentRegion.onmousemove();
                this.mouseMove = true;
            }

            // handle touchstart
            if (this.touchStart && this.currentRegion.touchstart !== undefined) {
                this.currentRegion.touchstart();
                this.touchStart = false;
            }

            // handle touchend
            if (this.touchEnd && this.currentRegion.touchend !== undefined) {
                this.currentRegion.touchend();
                this.touchEnd = false;
            }

            // handle touchmove
            if (!this.touchMove && this.currentRegion.touchmove !== undefined) {
                this.currentRegion.touchmove();
                this.touchMove = true;
            }

        } else if (this.regionIndex == this.lastRegionIndex) {
            this.lastRegionIndex = -1;
            this.mouseOverRegionIndex = -1;

            // handle mouseout condition
            if (this.currentRegion.onmouseout !== undefined) {
                this.currentRegion.onmouseout();
            }
        }
    }


};