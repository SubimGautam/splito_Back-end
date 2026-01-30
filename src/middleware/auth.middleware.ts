import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.log("🔐 Auth middleware called");
  console.log("📋 Request headers:", req.headers);
  
  try {
    const authHeader = req.headers.authorization;
    console.log("🔑 Authorization header:", authHeader);
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("❌ No Bearer token found in authorization header");
      return res.status(401).json({ 
        success: false, 
        message: "No token provided" 
      });
    }

    const token = authHeader.split(" ")[1];
    console.log("🔑 Token received (first 30 chars):", token.substring(0, Math.min(30, token.length)) + "...");
    console.log("🔑 Full token length:", token.length);
    
    if (!token) {
      console.log("❌ Token is empty after splitting");
      return res.status(401).json({ 
        success: false, 
        message: "No token provided" 
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    console.log("✅ Token verified successfully:");
    console.log("   - User ID:", decoded.userId);
    console.log("   - Role:", decoded.role);
    console.log("   - Issued at:", new Date(decoded.iat * 1000));
    console.log("   - Expires at:", new Date(decoded.exp * 1000));
    
    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp < now) {
      console.log("❌ Token expired!");
      console.log("   - Current time:", now);
      console.log("   - Expiry time:", decoded.exp);
      return res.status(401).json({ 
        success: false, 
        message: "Token expired" 
      });
    }

    // Attach user to request
    req.user = { id: decoded.userId };
    console.log("✅ User attached to request:", req.user);
    
    next();
  } catch (error: any) {
    console.error("❌ Token verification error:", error.message);
    
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ 
        success: false, 
        message: "Token expired"  
      });
    }
    
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ 
        success: false, 
        message: "Invalid token" 
      });
    }
    
    return res.status(401).json({ 
      success: false, 
      message: "Invalid token" 
    });
  }
};