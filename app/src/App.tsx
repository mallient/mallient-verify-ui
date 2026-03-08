import { BrowserRouter } from "react-router-dom";
import "./App.css";
import { ThemeProvider } from "./theme/theme-provider";
import { routing as Routing } from "./routing/router";
import { Banner } from "./components/layout/Banner";

function App() {
  return (
    <>
      <div className="min-h-screen flex flex-col">
        <ThemeProvider defaultTheme="system">
          <Banner />
          <BrowserRouter>
            <Routing />
          </BrowserRouter>
        </ThemeProvider>
      </div>
    </>
  );
}

export default App;
