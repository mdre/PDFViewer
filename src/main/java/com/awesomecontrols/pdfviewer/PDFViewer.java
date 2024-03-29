package com.awesomecontrols.pdfviewer;

import com.vaadin.flow.component.ClientCallable;
import com.vaadin.flow.component.HasComponents;
import com.vaadin.flow.component.HasSize;
import com.vaadin.flow.component.HasStyle;
import com.vaadin.flow.component.HasTheme;
import com.vaadin.flow.component.Tag;
import com.vaadin.flow.component.dependency.JsModule;
import com.vaadin.flow.component.dependency.NpmPackage;
import com.vaadin.flow.component.page.AppShellConfigurator;
import com.vaadin.flow.component.page.Push;
import com.vaadin.flow.component.polymertemplate.PolymerTemplate;
import com.vaadin.flow.templatemodel.TemplateModel;
import java.util.HashMap;
import java.util.concurrent.CompletableFuture;
import java.util.logging.Level;
import java.util.logging.Logger;

@Push
@Tag("pdf-viewer")
@NpmPackage(value = "pdfjs-dist", version = "3.6.172")
// @NpmPackage(value = "pdfjs-dist", version = "2.15.349")
// @NpmPackage(value = "pdfjs-dist", version = "2.5.207") --> con este funcionaba: 2.10.377
@JsModule("./pdfviewer/pdf-viewer.js")
public class PDFViewer extends PolymerTemplate<TemplateModel> implements HasSize, HasTheme, HasStyle, HasComponents, AppShellConfigurator {

    /**
     *
     */
    private static final long serialVersionUID = 5630472247035116755L;

    private final static Logger LOGGER = Logger.getLogger(PDFViewer.class.getName());
    static {
        if (LOGGER.getLevel() == null) {
            LOGGER.setLevel(Level.INFO);
        }
    }
    boolean ready = false;
    
    int pdfImageX;
    int pdfImageY;
    double imageScale = 1;
    int currentPage = 1;
    int pageCount;
    
    ICoordUpdateEvent coordsEvent;
    // factor de conversión de pixels a points
    float pxToptScale= 0.75f;

    private HashMap<String, CompletableFuture> imgDic;

    /**
     */
    public PDFViewer() {
        imgDic = new HashMap<>();
        this.setWidth("50px");
        this.setHeight("50px");
    }

    
    /**
     */
    public void load(String resource) {
        LOGGER.log(Level.FINEST, "URL: "+resource);
        
            getElement().callJsFunction("load", resource);
    }

    
    public PDFViewer drawImage(String imageName, String imageURL) {
    
        getElement().callJsFunction("drawImage", imageName, imageURL);
        
        return this;
    }
    
    
    @ClientCallable
    private void _setPDFImageCoords(int pdfX, int pdfY) {
        LOGGER.log(Level.FINEST,"Image coords: "+pdfX+","+pdfY );
        this.pdfImageX = pdfX;
        this.pdfImageY = pdfY;
    }

    @ClientCallable
    private void _setImageCoords(int x, int y) {
        if (this.coordsEvent != null) {
            coordsEvent.updateCoordinates(x, y);
        }
    }

    public void onCoordsChanged(ICoordUpdateEvent ce) {
        this.coordsEvent = ce;
    }

    public float getPDFImageX() {
        return pdfImageX;
    }

    public float getPDFImageY() {
        return pdfImageY;
    }
    
    public PDFViewer setImageScale(double e) {
        this.imageScale = e;
        getElement().callJsFunction("setImageScale", this.imageScale);
        return this;
    }

    public PDFViewer setImageCoords(int x, int y) {
        getElement().callJsFunction("setImageCoords", x,y);
        return this;
    }
    
    public double getImageScale() {
        return this.imageScale;
    }

    @ClientCallable
    private void setCurrentPage(int page) {
        this.currentPage = page;
    }

    @ClientCallable
    private void setPageCount(int pageCount) {
        this.pageCount = pageCount;
    }
    
    public int getPageCount() {
        return this.pageCount;
    }
    
    public int getCurrentPage() {
        return this.currentPage;
    }
    
    public PDFViewer showPage(int page) {
        
        return this;
    }
    
    // remove the image added
    public PDFViewer removeImage() {
        getElement().callJsFunction("removeImage");
        return this;
    }
}
