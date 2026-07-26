import React, { useState } from "react"
import { useNavigate } from "react-router-dom";
import { login as loginApi  } from "../api/auth";
import { useAuth } from "../context/AuthContext";

export  default function LoginPage(){
    const [email , setEmail] = useState("");
    const [password,setPassword] = useState("");
    const [error , setError] = useState("");
    const {login} = useAuth();
    const navigate = useNavigate();;

    const handleSubmit = async(e : React.FormEvent) => {
        e.preventDefault();
        setError("");
        try {
            const result = await loginApi(email, password);
            login(result.user, result.token);
            navigate("/movies")
        } catch (error : any) {
            setError(error.response?.data.message ?? "Login Failed")
        }
    }

    return (
       <>
         <form action="" onSubmit={handleSubmit}>
            <h1>login</h1>
            <input type="email" placeholder="example@email.com" value={email} onChange={(e)=> setEmail(e.target.value)} required/>
            <input type="password" placeholder="Password"  onChange={(e)=> setPassword(e.target.value)} required/>
            <button type="submit">Submit</button>
         </form>
       </>
    )
}