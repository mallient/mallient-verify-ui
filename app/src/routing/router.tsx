import { Verify } from "@/components/verify/verify";
import { MobileVerify } from "@/components/verify/mobile-verify";
import { Route, Routes } from "react-router-dom";

export const routing = () => {
  return (
    <>
      <Routes>
        <Route path="/" element={<Verify />} />
        <Route path="/verify" element={<Verify />} />
        <Route path="/mobile-verify" element={<MobileVerify />} />
        <Route
          path="/dashboard"
          element={
              <div className="flex flex-col items-center justify-center flex-1 p-8">
                <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
                <p className="text-gray-400">Welcome! You're authenticated.</p>
              </div>
          }
        />
      </Routes>
    </>
  );
};
