import { useState, useEffect, useRef, useCallback } from "react";
import { useSocket } from "../context/SocketContext";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import VideoPlayer from "../features/webrtc/VideoPlayer";
import MatchmakingSpinner from "../features/webrtc/MatchmakingSpinner";
import toast from "react-hot-toast";

const ICE_SERVERS = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

export default function OmegleCloneRoom() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { on, emit, joinQueue, leaveQueue, skipPeer, sendOffer, sendAnswer, sendIceCandidate, sendHangup } = useSocket();

  const [phase, setPhase] = useState("idle"); // idle | waiting | matched | ended
  const [queuePos, setQueuePos] = useState(null);
  const [peer, setPeer] = useState(null);

  const localRef = useRef(null);
  const remoteRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const roomRef = useRef(null);
  const isInitiatorRef = useRef(false);

  const stopMedia = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    if (localRef.current) localRef.current.srcObject = null;
    if (remoteRef.current) remoteRef.current.srcObject = null;
  }, []);

  const closePC = useCallback(() => {
    pcRef.current?.close();
    pcRef.current = null;
  }, []);

  const cleanup = useCallback(() => {
    stopMedia();
    closePC();
    roomRef.current = null;
    isInitiatorRef.current = false;
    setPeer(null);
    setPhase("idle");
    setQueuePos(null);
  }, [stopMedia, closePC]);

  const createPC = useCallback((targetId) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;

    pc.onicecandidate = ({ candidate }) => {
      if (candidate) sendIceCandidate(targetId, candidate);
    };

    pc.ontrack = (e) => {
      if (remoteRef.current) remoteRef.current.srcObject = e.streams[0];
    };

    pc.onconnectionstatechange = () => {
      if (["failed", "disconnected", "closed"].includes(pc.connectionState)) {
        cleanup();
      }
    };

    return pc;
  }, [sendIceCandidate, cleanup]);

  const startMedia = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localStreamRef.current = stream;
    if (localRef.current) localRef.current.srcObject = stream;
    return stream;
  }, []);

  // Handle match
  useEffect(() => {
    return on("matchmaking:matched", async ({ roomId, peer: peerInfo, initiator }) => {
      setPhase("matched");
      setPeer(peerInfo);
      roomRef.current = roomId;
      isInitiatorRef.current = initiator;

      let stream;
      try {
        stream = await startMedia();
      } catch {
        toast.error("Camera/mic access denied");
        cleanup();
        return;
      }

      const pc = createPC(peerInfo._id ?? peerInfo);
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      if (initiator) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        sendOffer(peerInfo._id ?? peerInfo, offer);
      }
    });
  }, [on, startMedia, createPC, sendOffer, cleanup]);

  // Incoming offer (answerer)
  useEffect(() => {
    return on("webrtc:offer", async ({ from, offer }) => {
      if (!pcRef.current) return;
      await pcRef.current.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pcRef.current.createAnswer();
      await pcRef.current.setLocalDescription(answer);
      sendAnswer(from, answer);
    });
  }, [on, sendAnswer]);

  // Incoming answer (initiator)
  useEffect(() => {
    return on("webrtc:answer", async ({ answer }) => {
      await pcRef.current?.setRemoteDescription(new RTCSessionDescription(answer));
    });
  }, [on]);

  // ICE
  useEffect(() => {
    return on("webrtc:ice-candidate", async ({ candidate }) => {
      try { await pcRef.current?.addIceCandidate(new RTCIceCandidate(candidate)); } catch (_) {}
    });
  }, [on]);

  // Peer left / hangup
  useEffect(() => {
    const off1 = on("matchmaking:peer_left", () => {
      toast("Your peer disconnected", { icon: "👋" });
      cleanup();
    });
    const off2 = on("webrtc:hangup", () => { cleanup(); });
    return () => { off1(); off2(); };
  }, [on, cleanup]);

  // Waiting / error
  useEffect(() => {
    const off1 = on("matchmaking:waiting", ({ position }) => {
      setPhase("waiting");
      setQueuePos(position);
    });
    const off2 = on("matchmaking:error", ({ message }) => {
      toast.error(message);
      cleanup();
    });
    return () => { off1(); off2(); };
  }, [on, cleanup]);

  const handleJoin = () => {
    setPhase("waiting");
    joinQueue();
  };

  const handleSkip = () => {
    if (peer) sendHangup(peer._id ?? peer);
    closePC();
    stopMedia();
    setPeer(null);
    setPhase("waiting");
    skipPeer();
  };

  const handleLeave = () => {
    if (peer) sendHangup(peer._id ?? peer);
    leaveQueue();
    cleanup();
    navigate("/dashboard");
  };

  return (
    <div style={{
      minHeight: "calc(100vh - 60px)", background: "#0a0a0f",
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", padding: "2rem",
      fontFamily: "'DM Sans', sans-serif",
    }}>
      {phase === "idle" && (
        <div style={{ textAlign: "center", maxWidth: 480 }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>🎥</div>
          <h2 style={{ color: "#f1f5f9", fontWeight: 700, fontSize: "1.75rem", marginBottom: "0.75rem" }}>
            Random Video Matchmaking
          </h2>
          <p style={{ color: "#64748b", marginBottom: "2rem" }}>
            Connect instantly with a random peer for a video call. Premium feature.
          </p>
          <button
            onClick={handleJoin}
            style={{
              padding: "0.8rem 2rem", borderRadius: "0.75rem",
              background: "linear-gradient(135deg,#6ee7f7,#a78bfa)",
              color: "#0a0a0f", fontWeight: 700, fontSize: "1rem",
              border: "none", cursor: "pointer",
            }}
          >
            Join Queue
          </button>
        </div>
      )}

      {phase === "waiting" && <MatchmakingSpinner position={queuePos} />}

      {phase === "matched" && (
        <div style={{ width: "100%", maxWidth: 900 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.25rem" }}>
            <VideoPlayer ref={remoteRef} label={peer?.fullName ?? "Peer"} style={{ height: 360 }} />
            <VideoPlayer ref={localRef} muted mirror label="You" style={{ height: 360 }} />
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: "1rem" }}>
            <button onClick={handleSkip} style={{
              padding: "0.65rem 1.5rem", borderRadius: "0.75rem",
              background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
              color: "#e2e8f0", fontWeight: 600, cursor: "pointer", fontSize: "0.9rem",
            }}>Skip →</button>
            <button onClick={handleLeave} style={{
              padding: "0.65rem 1.5rem", borderRadius: "0.75rem",
              background: "rgba(248,113,113,0.12)", border: "1px solid rgba(248,113,113,0.25)",
              color: "#f87171", fontWeight: 600, cursor: "pointer", fontSize: "0.9rem",
            }}>End Call</button>
          </div>
        </div>
      )}
    </div>
  );
}
