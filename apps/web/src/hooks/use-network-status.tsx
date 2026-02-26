import { useEffect, useState } from "react";

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [connectionType, setConnectionType] = useState<string>("unknown");

  useEffect(() => {
    const handleOnline = () => {
      console.log("🌐 Network: Online");
      setIsOnline(true);
    };

    const handleOffline = () => {
      console.log("📵 Network: Offline");
      setIsOnline(false);
    };

    const updateConnectionType = () => {
      const connection = (navigator as any).connection || 
                        (navigator as any).mozConnection || 
                        (navigator as any).webkitConnection;
      
      if (connection) {
        setConnectionType(connection.effectiveType || "unknown");
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Monitor connection type changes
    const connection = (navigator as any).connection || 
                      (navigator as any).mozConnection || 
                      (navigator as any).webkitConnection;
    
    if (connection) {
      connection.addEventListener("change", updateConnectionType);
      updateConnectionType();
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      
      if (connection) {
        connection.removeEventListener("change", updateConnectionType);
      }
    };
  }, []);

  return { 
    isOnline, 
    connectionType,
    isSlowConnection: connectionType === "slow-2g" || connectionType === "2g"
  };
}
