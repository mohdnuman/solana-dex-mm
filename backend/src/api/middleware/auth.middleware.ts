import _ from "lodash";
import jwt from "jsonwebtoken";

function verifyJwt(req: any, res: any, next: any) {
    const authHeader = req.headers.authorization;
    if (_.isEmpty(authHeader) || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({error: "Not authenticated"});
    }

    const token = authHeader.split(" ")[1];
    try {
        //@ts-ignore
        jwt.verify(token, process.env["JWT_SECRET"]);
        next();
    } catch (e) {
        return res.status(403).json({error: "Invalid token"});
    }
}

export default {verifyJwt: verifyJwt};
