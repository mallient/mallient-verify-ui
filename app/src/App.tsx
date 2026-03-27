import { BrowserRouter } from "react-router-dom";
import "./App.css";
import { ThemeProvider } from "./theme/theme-provider";
import { BrandConfigProvider, useBrandConfig } from "./context/brandConfigContext";
import { SessionProvider } from "./context/sessionContext";
import { routing as Routing } from "./routing/router";
import { Banner } from "./components/layout/Banner";
import { Loading } from "./theme/loading";

function AppContent() {
  const { isLoading, error } = useBrandConfig();

  if (isLoading) {
    return <Loading message="Loading" />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center flex-1 p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-500 mb-2">Configuration Error</h1>
          <p className="text-gray-400">Unable to load site configuration. Please try again later.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Banner />
      <div className="max-w-[1280px] mx-auto px-8 w-full flex flex-col flex-1">
        <BrowserRouter>
          <SessionProvider>
            <Routing />
          </SessionProvider>
        </BrowserRouter>
      </div>
    </>
  );
}

function App() {
  return (
    <>
      <div className="min-h-screen flex flex-col">
        <ThemeProvider defaultTheme="system">
          <BrandConfigProvider>
            <AppContent />
          </BrandConfigProvider>
        </ThemeProvider>
      </div>
    </>
  );
}

export default App;
