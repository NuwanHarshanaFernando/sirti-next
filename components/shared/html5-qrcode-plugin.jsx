import { Html5QrcodeScanner } from 'html5-qrcode';
import { useEffect, useRef } from 'react';


const createConfig = (props) => {
    let config = {};
    if (props.fps) {
        config.fps = props.fps;
    }
    if (props.qrbox) {
        config.qrbox = props.qrbox;
    }
    if (props.aspectRatio) {
        config.aspectRatio = props.aspectRatio;
    }
    if (props.disableFlip !== undefined) {
        config.disableFlip = props.disableFlip;
    }
    return config;
};

const Html5QrcodePlugin = (props) => {
    const qrcodeRegionId = useRef(null);
    const scannerRef = useRef(null);

    
    if (!qrcodeRegionId.current) {
        qrcodeRegionId.current = `html5qr-code-full-region-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    useEffect(() => {
        let isActive = true;
        
        const initializeScanner = async () => {
            if (!isActive || scannerRef.current) return;
            
            
            const existingElement = document.getElementById(qrcodeRegionId.current);
            if (existingElement) {
                existingElement.innerHTML = '';
            }
            
            
            const config = createConfig(props);
            const verbose = props.verbose === true;
            
            if (!(props.qrCodeSuccessCallback)) {
                throw "qrCodeSuccessCallback is required callback.";
            }
            
            scannerRef.current = new Html5QrcodeScanner(qrcodeRegionId.current, config, verbose);            if (isActive) {
                scannerRef.current.render(props.qrCodeSuccessCallback, props.qrCodeErrorCallback);
                  
                const addRoundedCorners = () => {
                    const videoElement = document.querySelector(`#${qrcodeRegionId.current} video`);
                    if (videoElement) {
                        videoElement.classList.add('rounded-lg');
                        videoElement.style.borderRadius = '10px';
                        return true;
                    }
                    return false;
                };                
                const removeBorder = () => {
                    const scannerContainer = document.getElementById(qrcodeRegionId.current);
                    if (scannerContainer) {
                        scannerContainer.style.border = 'none';
                        scannerContainer.style.borderWidth = '0px';
                        return true;
                    }
                    return false;
                };

                
                const addShadedRegionRounding = () => {
                    const shadedRegion = document.querySelector(`#${qrcodeRegionId.current} #qr-shaded-region`);
                    if (shadedRegion) {
                        shadedRegion.style.borderRadius = '10px';
                        return true;
                    }
                    return false;
                };                
                setTimeout(() => {
                    addRoundedCorners();
                    removeBorder();
                    addShadedRegionRounding();
                }, 300);
                setTimeout(() => {
                    addRoundedCorners();
                    removeBorder();
                    addShadedRegionRounding();
                }, 600);
                setTimeout(() => {
                    addRoundedCorners();
                    removeBorder();
                    addShadedRegionRounding();
                }, 1000);                
                const observer = new MutationObserver((mutations) => {
                    mutations.forEach((mutation) => {
                        if (mutation.addedNodes.length > 0) {
                            addRoundedCorners();
                            removeBorder();
                            addShadedRegionRounding();
                            if (addRoundedCorners() && removeBorder() && addShadedRegionRounding()) {
                                observer.disconnect();
                            }
                        }
                    });
                });
                
                const targetElement = document.getElementById(qrcodeRegionId.current);
                if (targetElement) {
                    observer.observe(targetElement, { childList: true, subtree: true });
                }
            }
        };

        
        const timer = setTimeout(() => {
            initializeScanner().catch(error => {
                if (isActive) {
                    props.onInitializationError?.(error);
                }
            });
        }, 100);

        
        return () => {
            isActive = false;
            clearTimeout(timer);
            if (scannerRef.current) {
                scannerRef.current.clear().catch(error => {
                    
                    if (!error.message?.includes('was removed from the document') && 
                        !error.message?.includes('play() request was interrupted')) {
                        props.onInitializationError?.(error);
                    }
                });
                scannerRef.current = null;
            }
        };
    }, []);

    return (
        <div id={qrcodeRegionId.current} />
    );
};

export default Html5QrcodePlugin;
