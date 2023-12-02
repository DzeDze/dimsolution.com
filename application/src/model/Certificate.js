class Certificate{
    
    constructor(jsonObj){
        
        if(undefined == jsonObj){
            jsonObj = {
                tokenId: Math.random(),
                name: "Certificate Name",
            };
        }

        this.tokenId = jsonObj.tokenId;
        this.name = jsonObj.name;
    }
}

export default Certificate;