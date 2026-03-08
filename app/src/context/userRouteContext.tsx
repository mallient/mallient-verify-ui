import { type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { history } from "../lib/history";

type Props = {
  children: ReactNode;
};

const UserRoute = ({ children }: Props) => {
  history.navigate = useNavigate();
  history.location = useLocation();

  return children;
};

export default UserRoute;
