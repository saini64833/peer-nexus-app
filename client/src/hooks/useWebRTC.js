import { useRef, useState, useCallback, useEffect } from "react";
import { useSocket } from "../context/SocketContext";

/**
 * useWebRTC
 * Manages a single WebRTC peer connection for video/audio calls.
 * Works with the signaling events relayed through SocketContext.
 */
export function useWebRTC({ localVideoRef, remoteVideoRef } = {}) {
  const { on, sendOffer, sendAnswer, sendIceCandidate, sendHangup } = useSocket();
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);

  const [callState, setCallState] = useState("idle"); // idle | calling | connected | ended
  const [peerId, setPeerId] = useState(null);

  const ICE_SERVERS = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  };

  const stopLocalStream = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    if (localVideoRef?.current) localVideoRef.current.srcObject = null;
  }, [localVideoRef]);

  const closePeerConnection = useCallback(() => {
    pcRef.current?.close();
    pcRef.current = null;
    if (remoteVideoRef?.current) remoteVideoRef.current.srcObject = null;
  }, [remoteVideoRef]);

  const cleanup = useCallback(() => {
    stopLocalStream();
    closePeerConnection();
    setCallState("idle");
    setPeerId(null);
  }, [stopLocalStream, closePeerConnection]);

  const createPeerConnection = useCallback(
    (targetId) => {
      const pc = new RTCPeerConnection(ICE_SERVERS);
      pcRef.current = pc;

      pc.onicecandidate = ({ candidate }) => {
        if (candidate) sendIceCandidate(targetId, candidate);
      };

      pc.ontrack = (e) => {
        if (remoteVideoRef?.current) {
          remoteVideoRef.current.srcObject = e.streams[0];
        }
      };

      pc.onconnectionstatechange = () => {
        if (["disconnected", "failed", "closed"].includes(pc.connectionState)) {
          cleanup();
        }
      };

      return pc;
    },
    [sendIceCandidate, remoteVideoRef, cleanup]
  );

  /** Start an outgoing call */
  const startCall = useCallback(
    async (targetId) => {
      setPeerId(targetId);
      setCallState("calling");

      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      localStreamRef.current = stream;
      if (localVideoRef?.current) localVideoRef.current.srcObject = stream;

      const pc = createPeerConnection(targetId);
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      sendOffer(targetId, offer);
    },
    [createPeerConnection, localVideoRef, sendOffer]
  );

  /** Answer an incoming offer */
  const answerCall = useCallback(
    async (targetId, offer) => {
      setPeerId(targetId);
      setCallState("connected");

      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      localStreamRef.current = stream;
      if (localVideoRef?.current) localVideoRef.current.srcObject = stream;

      const pc = createPeerConnection(targetId);
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      sendAnswer(targetId, answer);
    },
    [createPeerConnection, localVideoRef, sendAnswer]
  );

  const hangup = useCallback(() => {
    if (peerId) sendHangup(peerId);
    cleanup();
  }, [peerId, sendHangup, cleanup]);

  // Listen for WebRTC signaling events
  useEffect(() => {
    const offAnswer = on("webrtc:answer", async ({ from, answer }) => {
      await pcRef.current?.setRemoteDescription(new RTCSessionDescription(answer));
      setCallState("connected");
      setPeerId(from);
    });

    const offIce = on("webrtc:ice-candidate", async ({ candidate }) => {
      try {
        await pcRef.current?.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (_) {}
    });

    const offHangup = on("webrtc:hangup", () => {
      cleanup();
    });

    return () => {
      offAnswer();
      offIce();
      offHangup();
    };
  }, [on, cleanup]);

  return { callState, peerId, startCall, answerCall, hangup };
}

export default useWebRTC;
