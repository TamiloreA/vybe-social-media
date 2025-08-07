"use client";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Phone, Video, VideoOff, Mic, MicOff, X } from "lucide-react";

interface CallInterfaceProps {
  call: {
    roomId: string;
    type: 'audio' | 'video';
    isInitiator: boolean;
    localStream: MediaStream | null;
    remoteStream: MediaStream | null;
  };
  onEnd: () => void;
  onToggleVideo: () => void;
  onToggleAudio: () => void;
}

export default function CallInterface({ 
  call, 
  onEnd,
  onToggleVideo,
  onToggleAudio
}: CallInterfaceProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [connectionStatus, setConnectionStatus] = useState("connecting");
  
  // Attach media streams to video elements
  useEffect(() => {
    if (call.localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = call.localStream;
    }
    
    if (call.remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = call.remoteStream;
      setConnectionStatus("connected");
    } else {
      const timer = setTimeout(() => {
        if (!call.remoteStream) {
          setConnectionStatus("connection-failed");
        }
      }, 10000);
      
      return () => clearTimeout(timer);
    }
  }, [call.localStream, call.remoteStream]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black z-50 flex flex-col"
    >
      {/* Remote video (main) */}
      <div className="flex-1 relative bg-black">
        {call.remoteStream ? (
          <video 
            ref={remoteVideoRef}
            autoPlay 
            playsInline
            muted={false}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="bg-gray-800 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4">
                <div className="bg-gray-700 w-16 h-16 rounded-full flex items-center justify-center">
                  <div className={`w-10 h-10 rounded-full ${
                    connectionStatus === "connecting" 
                      ? "bg-blue-500 animate-pulse" 
                      : "bg-red-500"
                  }`}></div>
                </div>
              </div>
              <p className="text-white text-lg">
                {connectionStatus === "connecting" 
                  ? "Connecting..." 
                  : "Connection failed. Try again?"}
              </p>
              {connectionStatus === "connection-failed" && (
                <Button
                  onClick={onEnd}
                  className="mt-4 bg-red-500 hover:bg-red-600"
                >
                  End Call
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Local video (pip) */}
      {call.type === 'video' && call.localStream && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute bottom-24 right-4 w-32 h-48 rounded-lg overflow-hidden border-2 border-white shadow-lg"
        >
          <video 
            ref={localVideoRef}
            autoPlay 
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        </motion.div>
      )}

      {/* Call controls */}
      <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-8">
        <Button
          onClick={onToggleVideo}
          className="w-14 h-14 rounded-full bg-gray-700/50 hover:bg-gray-600/50"
        >
          {call.type === 'video' ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
        </Button>
        
        <Button
          onClick={onToggleAudio}
          className="w-14 h-14 rounded-full bg-gray-700/50 hover:bg-gray-600/50"
        >
          <Mic className="w-6 h-6" />
        </Button>
        
        <Button
          onClick={onEnd}
          className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600"
        >
          <X className="w-6 h-6" />
        </Button>
      </div>

      {/* Call info */}
      <div className="absolute top-4 left-0 right-0 text-center">
        <p className="text-white text-lg">
          {call.type === 'video' ? 'Video Call' : 'Voice Call'} • {call.isInitiator ? 'Outgoing' : 'Incoming'}
        </p>
        <p className="text-gray-300 text-sm">
          {connectionStatus === "connected" ? 'Connected' : 
           connectionStatus === "connecting" ? 'Connecting...' : 'Connection failed'}
        </p>
      </div>
    </motion.div>
  );
}