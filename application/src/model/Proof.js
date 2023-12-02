class Proof{

    constructor(jsonObj){
        
        if(undefined == jsonObj){
            jsonObj = {
                tokenId: Math.random(),
                name: "Christiano Ronaldo",
                to: "0x70816b323b6C3B9302F493e0EE8F0E32CfcAdeF00x70816b323b6C3B9302F493e0EE8F0E32CfcAdeF00x70816b323b6C3B9302F493e0EE8F0E32CfcAdeF00x70816b323b6C3B9302F493e0EE8F0E32CfcAdeF0",
                dob: "02/11/2020",
                location: "2st North First Street",
                shared_date: "11/10/2023",
            };
        }

        this.tokenId = jsonObj.tokenId;
        this.name = jsonObj.name;
        this.to = jsonObj.to;
        this.dob = jsonObj.dob;
        this.location = jsonObj.location;
        this.shared_date = jsonObj.shared_date;
    }
}

export default Proof