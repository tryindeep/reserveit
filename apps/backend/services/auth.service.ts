
import { db } from "@repo/db"
import { comparePassword, hashPassword, signToken } from "../utils/auth";

const stripPassword = <T extends { passwordHash: string }>(user: T) => {
  const { passwordHash: _drop, ...safeUser } = user;
  return safeUser;
};

export const AuthService = {
    register : async(data : {
        email: string,
        password: string,
        name: string,
        phone? : string
    }) => {
        const existing = await db.user.findUnique({
            where : {email : data.email,}
        });
        if(existing) return {error : "EMAIL_EXISTS" as const};

        const passwordHashed = await hashPassword(data.password);
        const user = await db.user.create({
            data : {
                email : data.email,
                passwordHash : passwordHashed, 
                name : data.name,
                phone : data.phone,
                role : "CUSTOMER"
            }
        })
        const token = signToken({userId : user.id, role: "CUSTOMER"});
        return { data: { user: stripPassword(user), token } };
    },

    registerClient : async(data : {
        email : string,
        password : string,
        name : string,
        phone : string,
        businessName : string,
        }) => {
            const existing = await db.user.findUnique({where:{
                email : data.email
        }});

        if(existing) return { error : "EMAIL_EXISTS" as const};

        const  passwordHashed = await hashPassword(data.password);
        const user = await db.user.create({
            data : {
                email : data.email,
                passwordHash : passwordHashed,
                name: data.name,
                phone : data.phone,
                role : "CLIENT",
                ClientProfile : {
                    create : {
                        businessName : data.businessName,
                        status : "PENDING"
                    }
                }, 
            },
            include : { ClientProfile : true }
            
        });
        const token = signToken({userId : user.id , role : "CLIENT"})
        return { data: { user: stripPassword(user), token } };
    },


    login : async(email : string , password : string) => {
        const user = await db.user.findUnique({
            where: { email },
            select: {
                id: true,
                email: true,
                name: true,
                phone: true,
                role: true,
                passwordHash: true,
                ClientProfile: true,
            },
        });
        if(!user) return { error: "INVALID_CREDENTIALS" as const };

        const isValid = await comparePassword(
            password,
            user.passwordHash
        );
        if(!isValid) {
            return { error: "INVALID_CREDENTIALS" as const };
        }

        const token = signToken({ userId: user.id, role: user.role});
        return { data: { user: stripPassword(user), token } };

    }
}