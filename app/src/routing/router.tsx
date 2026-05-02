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
      </Routes>
    </>
  );
};
