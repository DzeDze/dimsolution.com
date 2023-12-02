import { useState, useEffect } from 'react';
import { useDataStateContext, useDataDispatchContext } from "../DataProvider";
import Header from "../components/Header";
import img_card_dummy from "../assets/img/img_card_dummy.jpg"
import Certificate from '../model/Certificate';
import LoadingOverlay from 'react-loading-overlay';
import onchain_helpers from "../scripts/dim-onchain-helpers";
import offchain_helpers from "../scripts/dim-offchain-helpers";
import common_helpers from "../scripts/common_helpers";
import { useSDK } from '@metamask/sdk-react';

import { ethers } from "ethers";
import env from "../scripts/environment.json";

function Guardian() {
    const { MetaMask } = useDataStateContext();
    const dispatch = useDataDispatchContext();
    const [msg, setNotification] = useState("demo");

    const [certs, setCerts] = useState([]);
    const [isActive, setIsActive] = useState(false);
    const { sdk, chainId, account } = useSDK();

    const [inputs, setInputs] = useState({ 'new_holder_address': '' });
    const [recoverResult, setRecoverResult] = useState('');
    let ethersProvider = null;

    useEffect(() => {
        console.log('Init...')
    }, []);

    const getProvider = () => {
        if (!window.ethereum) {
            console.error("MetaMask provider not found");
            return;
        }

        // Initialize ethers provider
        if (ethersProvider === null) {
            ethersProvider = new ethers.providers.Web3Provider(window.ethereum);
        }
        return ethersProvider;
    }

    const cmdLoadGuaredIRC = async () => {
        try {
            setIsActive(true);
            const provider = getProvider();
            console.log(provider);
            await provider.send("eth_requestAccounts", []);
            const signer = provider.getSigner();
            const address = await signer.getAddress();
            console.log("address = ", address);
            const guardedList = await onchain_helpers.loadGuardedIRC(address, provider);
            console.log("guardedList", guardedList);
            guardedList.forEach((guardedToken) => {
                const tokenId = guardedToken.tokenId.toString();
                const metadata_cid = guardedToken.metadata_cid;
                const uri = `${env.PINATA_GATEWAY}${metadata_cid}`;
            });
            const promises = guardedList.map(guardedToken => {
                const tokenId = guardedToken.tokenId.toString();
                const metadata_cid = guardedToken.metadata_cid;
                const uri = `${env.PINATA_GATEWAY}${metadata_cid}`;
                return common_helpers.fetchIPFSData(uri).then(data => ({
                    tokenId: tokenId,
                    certificateName: data.certificateTitle,
                    holderAdress: data.holderUUID
                }));
            });

            const results = await Promise.all(promises);
            console.log("results = ", results);
            setCerts(results);
            setIsActive(false);
        }
        catch (error) {
            setIsActive(false);
            console.log(error);
        }
    }

    const handleChange = (event) => {

        const name = event.target.name;
        const value = event.target.value;

        setInputs(values => ({ ...values, [name]: value }))
    };

    const cmdDisConnect = () => {
        dispatch({ type: "SET_LOGIN", payload: false });
    }

    const cmdRecover = async () => {
        let new_holder_address = inputs['new_holder_address'];

        if (getSelectedCert() === null) {
            alert("You need to select at least one IRC to recover it.");
            return;
        }

        if (new_holder_address.trim().length === 0) {
            alert("The new Holder address need to be input.");
            return;
        }

        try {
            setIsActive(true);
            const selectingCert = getSelectedCert();
            const provider = getProvider();
            console.log("selectingCert = ", selectingCert);
            const tokenId = selectingCert.tokenId;
            const oldHolderAddress = selectingCert.holderAdress;
            const result = await onchain_helpers.transfer(oldHolderAddress, new_holder_address, tokenId, provider.getSigner());
            console.log("result = ", result);
            const resultTo = result.to;
            console.log("resultTo = ", resultTo);
            if(resultTo.trim().length != 0)
                setRecoverResult(result.to);
            setIsActive(false);
        }
        catch (error) {
            setIsActive(false);
            console.error('An error occurred while running the demo:', error);
            setNotification(error.toString());
        }
    }

    const selectCert = (selectingCert) => {

        let data = [];

        for (const cert of certs) {
            if (cert.tokenId === selectingCert.tokenId)
                cert.selected = true;
            else
                cert.selected = false;
            data.push(cert);
        }
        setCerts(data);

    }

    const getSelectedCert = () => {

        for (const cert of certs) {
            if (cert.selected) return cert;
        }
        return null;
    }

    const showRecoverResult = () => {
        if(recoverResult.trim().length === 0) return <></>
        return (
            <div className="row">
                <div className="col-lg-8 col-xl-6">
                    <span><strong>Recovered to</strong></span> <br />
                    <span className="color-success"><strong>{recoverResult}</strong></span>
                </div>
            </div>);
    }

    const showCerts = () => {

        if (certs.length == 0) return (<></>);

        let list = certs.map((cert) =>
            <div key={cert.tokenId} onClick={() => selectCert(cert)} className="col-md-6 col-lg-5 col-xl-4 mb-5">
                <div className={cert.selected ? "card-certificate selected" : "card-certificate"} selectable="true">
                    <div className="card-img">
                        <img src={img_card_dummy} alt="Certificates" />
                    </div>
                    <div className="card-body">
                        <div className="title">
                            <div>
                                <strong>{cert.certificateName}</strong>
                                <p>TokenId: # {cert.tokenId}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );

        return (
            <section className="block" id="guardianIRC">
                <div className="container">
                    <div className="row">
                        <div className="col-12">
                            <h2 className="title">Guarded Identity Representative Certificates</h2>
                            <p>Select one to Recover</p>
                        </div>
                    </div>

                    <div className="row">
                        {list}
                    </div>

                    <div className="row">
                        <div className="col-lg-8 col-xl-6">
                            <p>Recover to</p>
                            <div className="form-group">
                                <input name='new_holder_address' onChange={e => handleChange(e)} type="text" className="form-control" placeholder="New Holder blockchain address" />
                                <button onClick={cmdRecover} className="btn btn-primary">Recover</button>
                            </div>
                        </div>
                    </div>
                    {showRecoverResult()}
                </div>
            </section>
        )
    }

    return (
        <LoadingOverlay
            active={isActive}
            spinner
            text='Please wait...'
        >
            <div className="page">
                <Header title='GUARDIAN PAGE' />

                <div className="main">
                    <section className="block" id="guardianBannerHero">
                        <div className="container">
                            <div className="row mb-4">
                                <div className="col-12">
                                    <button className="btn btn-small" onClick={cmdDisConnect}>Disconnect Wallet</button>
                                </div>
                            </div>
                            <div className="row">
                                <div className="col-md-6 col-lg-5 col-xl-4">
                                    <h2 className="title">Welcome</h2>
                                    <p className="color-gray">{MetaMask.account}</p>
                                    <div>
                                        <button onClick={cmdLoadGuaredIRC} className="btn btn-primary">Load Guarded IRC</button>
                                    </div>
                                </div>

                            </div>
                        </div>
                    </section>

                    {showCerts()}
                    
                    <section className="block" id="pageLog">
                        <div className="container">
                            <div className="row">
                                <div className="col-12">
                                    <pre className="color-blue">
                                        {msg}
                                    </pre>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </LoadingOverlay>
    );
}

export default Guardian;