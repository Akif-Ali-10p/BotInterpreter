import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Translator from "@/pages/Translator";
import { useEffect, useState } from "react";
import { apiRequest } from "./lib/queryClient";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Translator}/>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initialize session ID if it doesn't exist
    const storedSessionId = localStorage.getItem("sessionId");
    
    if (storedSessionId) {
      setSessionId(storedSessionId);
      setIsLoading(false);
    } else {
      // Get new session ID from the server
      apiRequest("GET", "/api/session")
        .then(res => res.json())
        .then(data => {
          localStorage.setItem("sessionId", data.sessionId);
          setSessionId(data.sessionId);
        })
        .catch(err => {
          console.error("Failed to get session ID:", err);
          // Generate fallback session ID client-side
          const fallbackSessionId = Math.random().toString(36).substring(2, 15);
          localStorage.setItem("sessionId", fallbackSessionId);
          setSessionId(fallbackSessionId);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
