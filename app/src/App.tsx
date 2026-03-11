import { BrowserRouter } from "react-router-dom";
import "./App.css";
import { ThemeProvider } from "./theme/theme-provider";
import { BrandConfigProvider } from "./context/brandConfigContext";
import { SessionProvider } from "./context/sessionContext";
import { routing as Routing } from "./routing/router";
import { Banner } from "./components/layout/Banner";

function App() {
  return (
    <>
      <div className="min-h-screen flex flex-col">
        <ThemeProvider defaultTheme="system">
          <BrandConfigProvider>
            <Banner />
            <BrowserRouter>
              <SessionProvider>
                <Routing />
              </SessionProvider>
            </BrowserRouter>
          </BrandConfigProvider>
        </ThemeProvider>
      </div>
    </>
  );
}

export default App;
