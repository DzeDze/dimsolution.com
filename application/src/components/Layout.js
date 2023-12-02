import { Outlet} from "react-router-dom";

function Layout(){
    return (
        <div className="page">
            <Outlet />
        </div>
    );
}

export default Layout;