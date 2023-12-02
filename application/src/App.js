import { BrowserRouter, Routes, Route } from "react-router-dom";

import Issuer from "./pages/Issuer";
import Login from "./pages/Login";
import Holder from "./pages/Holder";
import Verifier from "./pages/Verifier";
import Guardian from "./pages/Guardian";

import { useDataStateContext } from "./DataProvider";

function App() {

  const {hasLogin} = useDataStateContext();

  const issuerView = () => {
    return hasLogin ? <Issuer /> : <Login />
  }

  const holderView = () => {
    return hasLogin ? <Holder /> : <Login />
  }

  const verifierView = () => {
    return hasLogin ? <Verifier /> : <Login />
  }

  const guardianView = () => {
    return hasLogin ? <Guardian /> : <Login />
  }

  return (
    <Routes>
        
      <Route index element={ issuerView()  } />

      <Route path="/holder" element={ holderView()} />

      <Route path="/verifier" element={ verifierView()} />

      <Route path="/guardian" element={ guardianView()} />

    </Routes>
    
  );
}

export default App;
