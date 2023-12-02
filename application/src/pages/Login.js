import { useSDK } from '@metamask/sdk-react';
import { useDataDispatchContext } from "../DataProvider";
import Header from "../components/Header";
import {ethers} from "ethers";

function Login(){
    const { sdk, connected, connecting, provider, chainId, account } = useSDK();

    const dispatch = useDataDispatchContext()

    const cmdConnect = async () => {
        try {
            await sdk?.connect();

            // if(connected){
                // const provider = new ethers.providers.Web3Provider(window.ethereum, "any");
                dispatch({type:"SET_LOGIN", payload: true});
                let meta = {account: account, chainId: chainId, provider: provider};
                dispatch({type:"SET_METAMASK", payload: meta});
            // }

        } catch (err) {
            console.warn(`failed to connect..`, err);
        }
    };

    return(
        <div className="page">
            <Header title=''/>
            <div className="main">
                <section className="block" id="issuerBannerHero">
                    <div className="container">
                        <div className="row mb-4">
                            <div className="col-12">
                                <button className="btn btn-small" onClick={cmdConnect}>Connect Wallet</button>
                            </div>
                        </div>
                        
                    </div>
                </section>
            </div>
        </div>
    );
}

export default Login;