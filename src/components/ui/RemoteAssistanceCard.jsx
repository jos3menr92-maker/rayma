import React, { useState, useEffect } from 'react';

const RemoteAssistanceCard = () => {
  const [pin, setPin] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [timeLeft, setTimeLeft] = useState(900); // 15 minutes in seconds

  // Handle countdown timer for PIN expiration
  useEffect(() => {
    let timer;
    if (pin && timeLeft > 0 && !isConnected) {
      timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    } else if (timeLeft === 0) {
      endSession();
    }
    return () => clearInterval(timer);
  }, [pin, timeLeft, isConnected]);

  const generatePin = () => {
    // Generate a secure 6-digit numeric PIN
    const newPin = Math.floor(100000 + Math.random() * 900000).toString();
    const formattedPin = `${newPin.substring(0, 3)}-${newPin.substring(3, 6)}`;
    setPin(formattedPin);
    setTimeLeft(900);
    setIsConnected(false);
    
    // TODO: Send this PIN to your backend table/JWT generator to register the active session token
  };

  const copyToClipboard = () => {
    if (pin) navigator.clipboard.writeText(pin.replace('-', ''));
    // Ideally, trigger a small toast notification here: "PIN Copied!"
  };

  const endSession = () => {
    setPin(null);
    setIsConnected(false);
    setTimeLeft(900);
    
    // TODO: Send kill-switch signal to backend to nullify token and sever the screen-share connection
  };

  // Mock function to simulate the developer connecting via Admin Panel
  const simulateConnection = () => {
    setIsConnected(true);
    // TODO: Once connected, this is where the API call to execute your custom bug search command is authorized to run against this user's environment.
  };

  // Format the remaining time for the UI
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 max-w-2xl mx-auto mt-6">
      
      {/* Header Section */}
      <div className="border-b border-gray-100 pb-4 mb-4">
        <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
          <span className="text-blue-600">🎧</span> Live Remote Assistance
        </h2>
        <p className="text-gray-500 text-sm mt-1">Secure, temporary access for troubleshooting.</p>
      </div>

      {/* Connection Status */}
      <div className="flex items-center gap-3 mb-6 bg-gray-50 p-3 rounded-lg">
        <span className="font-medium text-gray-700">Status:</span>
        {isConnected ? (
          <span className="flex items-center gap-2 text-green-600 font-semibold animate-pulse">
            <span className="h-3 w-3 bg-green-500 rounded-full"></span>
            Connected (Session Active)
          </span>
        ) : (
          <span className="flex items-center gap-2 text-red-500 font-semibold">
            <span className="h-3 w-3 bg-red-500 rounded-full"></span>
            Not Connected
          </span>
        )}
      </div>

      {/* PIN Generation Area */}
      <div className="text-center bg-blue-50/50 rounded-xl p-6 border border-blue-100 mb-6">
        <h3 className="text-lg font-medium text-gray-800 mb-2">Your Secure Support PIN</h3>
        <p className="text-sm text-gray-600 mb-6 max-w-md mx-auto">
          Provide this temporary 6-digit code to the support technician. 
          {pin && !isConnected && (
            <span className="text-red-500 font-medium block mt-1">
              Expires in {minutes}:{seconds.toString().padStart(2, '0')}
            </span>
          )}
        </p>

        {pin ? (
          <div className="flex flex-col items-center gap-4">
            <div className="text-4xl font-bold tracking-widest text-blue-700 font-mono">
              {pin}
            </div>
            <button 
              onClick={copyToClipboard}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1 transition-colors"
            >
              ⧉ Copy to Clipboard
            </button>
          </div>
        ) : (
          <button 
            onClick={generatePin}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors shadow-sm"
          >
            Generate New PIN
          </button>
        )}
      </div>

      {/* Privacy Guard & Kill Switch */}
      <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
        <div className="flex gap-3 mb-4">
          <span className="text-xl">🛡️</span>
          <p className="text-xs text-gray-600 leading-relaxed">
            <strong>Privacy Guard:</strong> The technician will only be able to view your screen and run diagnostic checks. They cannot initiate payments, view unmasked account numbers, or modify your connections. You can terminate this session at any time.
          </p>
        </div>
        
        <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200">
           {/* Temporary button just to test the UI states */}
           <button onClick={simulateConnection} className="text-xs text-gray-400 hover:text-gray-600 underline">
            [Dev Test: Connect]
          </button>

          <button 
            onClick={endSession}
            disabled={!pin}
            className={`font-medium py-2 px-4 rounded-lg transition-colors ${
              pin 
                ? 'bg-red-50 hover:bg-red-100 text-red-600 border border-red-200' 
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            🛑 End Session & Revoke Access
          </button>
        </div>
      </div>

    </div>
  );
};

export default RemoteAssistanceCard;
