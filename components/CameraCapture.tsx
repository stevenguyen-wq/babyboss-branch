import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Camera, X, RefreshCw, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';

interface CameraCaptureProps {
  onCapture: (imageSrc: string) => void;
  label?: string;
  autoStart?: boolean;
  facingMode?: 'user' | 'environment';
}

const CameraCapture: React.FC<CameraCaptureProps> = ({ 
  onCapture, 
  label = "Chụp ảnh", 
  autoStart = false,
  facingMode = 'user'
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Use a ref for the stream to ensure immediate synchronous access for cleanup
  const streamRef = useRef<MediaStream | null>(null);
  
  const [isActive, setIsActive] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const stopTracks = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        try {
            track.stop();
            // Explicitly disabling track can help some browsers release resource faster
            track.enabled = false; 
        } catch (e) {
            console.error("Error stopping track:", e);
        }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
        videoRef.current.srcObject = null;
    }
  }, []);

  const stopCamera = useCallback(() => {
    stopTracks();
    setIsActive(false);
  }, [stopTracks]);

  const startCamera = async () => {
    if (isLoading) return;
    setIsLoading(true);
    setError('');

    // Ensure previous session is completely cleaned up
    stopTracks();
    
    // If we were active, momentarily flicker off to ensure video element remounts cleanly if needed
    if (isActive) {
        setIsActive(false);
    }

    try {
      let mediaStream: MediaStream | null = null;
      
      // 1. Try requesting camera with specific facing mode AND higher resolution
      // Request 1080p (Full HD) or even higher if available for better OCR
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: facingMode,
            width: { ideal: 1920 }, // Prefer 1080p width
            height: { ideal: 1080 } // Prefer 1080p height
          }
        });
      } catch (err) {
        console.warn(`High-res constraint-based getUserMedia failed for ${facingMode}, retrying with basic config:`, err);
      }

      // 2. Fallback: Request 720p if 1080p fails
      if (!mediaStream) {
         try {
            mediaStream = await navigator.mediaDevices.getUserMedia({ 
                audio: false,
                video: {
                    facingMode: facingMode,
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            });
         } catch (fallbackErr: any) {
            console.warn("720p getUserMedia failed:", fallbackErr);
         }
      }

      // 3. Ultimate Fallback: Just get any video stream
      if (!mediaStream) {
         try {
            mediaStream = await navigator.mediaDevices.getUserMedia({ 
                video: true,
                audio: false 
            });
         } catch (finalErr: any) {
            console.error("Final fallback getUserMedia failed:", finalErr);
            throw finalErr; 
         }
      }
      
      // 3. Assign stream
      streamRef.current = mediaStream;
      setIsActive(true); // This will trigger the effect to attach srcObject
      
    } catch (err: any) {
      console.error("Camera access error:", err);
      let msg = 'Không thể khởi động camera.';
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'Quyền truy cập camera bị từ chối. Vui lòng cấp quyền trong cài đặt.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = 'Không tìm thấy camera trên thiết bị.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        msg = 'Camera đang bận hoặc gặp lỗi. Hãy đảm bảo không có ứng dụng nào khác đang sử dụng camera.';
      } else if (err.name === 'OverconstrainedError') {
        msg = 'Camera không hỗ trợ cấu hình yêu cầu.';
      } else if (err.name === 'NotSupportedError') {
        msg = 'Trình duyệt không hỗ trợ truy cập camera (Secure Context required).';
      } else if (err.message && err.message.includes('Could not start video source')) {
         msg = 'Không thể khởi động nguồn video. Vui lòng làm mới lại trang.';
      }
      
      setError(msg);
      setIsActive(false);
    } finally {
      setIsLoading(false);
    }
  };

  const capture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      if (context && video.videoWidth && video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Save state to restore later if needed
        context.save();
        
        // Only mirror if using front camera (user mode)
        if (facingMode === 'user') {
            context.translate(canvas.width, 0);
            context.scale(-1, 1);
        }
        
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        context.restore();
        
        // Use high quality JPEG for OCR
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        setImage(imgData);
        onCapture(imgData);
        stopCamera();
      }
    }
  };

  const retake = () => {
    setImage(null);
    startCamera();
  };

  // Attach stream to video element when active
  useEffect(() => {
    if (isActive && videoRef.current && streamRef.current) {
      const videoEl = videoRef.current;
      
      if (videoEl.srcObject !== streamRef.current) {
          videoEl.srcObject = streamRef.current;
          videoEl.onloadedmetadata = () => {
            videoEl.play().catch(e => console.warn("Play interrupted or failed", e));
          };
      }
    }
  }, [isActive]);

  // Handle autoStart
  useEffect(() => {
    let mounted = true;
    let timer: any;

    if (autoStart && !image && !isActive && !error && !isLoading) {
      timer = setTimeout(() => {
        if (mounted) startCamera();
      }, 100);
    }
    
    return () => { 
        mounted = false; 
        clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTracks();
    };
  }, [stopTracks]);

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto">
      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm flex items-start gap-2 mb-4 w-full">
            <AlertTriangle size={18} className="shrink-0 mt-0.5" />
            <span>{error}</span>
        </div>
      )}
      
      {!isActive && !image && (
        <button 
          onClick={startCamera}
          disabled={isLoading}
          className="flex items-center justify-center gap-2 bg-brand-600 text-white px-6 py-3 rounded-xl shadow-lg w-full transition-transform active:scale-95 disabled:bg-brand-400"
        >
          {isLoading ? <Loader2 className="animate-spin" size={20} /> : <Camera size={20} />}
          {label}
        </button>
      )}

      {isActive && (
        <div className="relative w-full bg-black rounded-xl overflow-hidden shadow-xl aspect-[3/4]">
          {/* Video Feed */}
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted 
            className="absolute inset-0 w-full h-full object-cover" 
            style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
          />
          
          {/* Controls Overlay */}
          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-6 z-10 pointer-events-none">
            <button 
              onClick={stopCamera}
              className="bg-white/20 backdrop-blur-md p-3 rounded-full text-white hover:bg-white/30 transition-colors pointer-events-auto"
            >
              <X size={24} />
            </button>
            <button 
              onClick={capture}
              className="pointer-events-auto group"
            >
               <div className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center transition-transform group-active:scale-95">
                 <div className="w-12 h-12 bg-white rounded-full" />
               </div>
            </button>
            <div className="w-12" /> {/* Spacer for centering */}
          </div>
        </div>
      )}

      {image && (
        <div className="relative w-full rounded-xl overflow-hidden shadow-md aspect-[3/4] bg-gray-100">
           {/* Display image - mirror only if user mode */}
           <img 
             src={image} 
             alt="Captured" 
             className="w-full h-full object-cover" 
           />
           <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
             <button 
                onClick={retake}
                className="flex items-center gap-2 bg-white text-gray-800 px-4 py-2 rounded-lg shadow-lg text-sm font-medium hover:bg-gray-50"
             >
               <RefreshCw size={16} /> Chụp lại
             </button>
             <div className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium">
               <CheckCircle size={16} /> Đã lưu
             </div>
           </div>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default CameraCapture;
