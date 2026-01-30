import { Request, Response } from "express";
import { AuthService } from "../services/auth.service";
import { RegisterDto } from "../dtos/register.dto";
import { LoginDto } from "../dtos/login.dto";

const authService = new AuthService();

export class AuthController {
  async register(req: Request, res: Response) {
    console.log("📝 Registration request received:", {
      username: req.body.username,
      email: req.body.email,
      passwordLength: req.body.password?.length,
      confirmPasswordLength: req.body.confirmPassword?.length
    });

    try {
      // Validate request body
      const data = RegisterDto.parse(req.body);
      console.log("✅ Data validated successfully");

      const result = await authService.register(
        data.username.trim(),
        data.email.toLowerCase().trim(),
        data.password
      );

      console.log("✅ Registration successful in service");

      // Return success response
      res.status(201).json({
        success: true,
        message: "Registration successful",
        data: {
          token: result.token,
          user: result.user
        }
      });

    } catch (err: any) {
      console.error("❌ Registration error:", err);
      
      // Handle validation errors from Zod
      if (err.errors) {
        return res.status(400).json({ 
          success: false,
          message: "Validation error", 
          errors: err.errors 
        });
      }
      
      // Handle duplicate email or other errors
      res.status(400).json({ 
        success: false,
        message: err.message || "Registration failed" 
      });
    }
  }

  async login(req: Request, res: Response) {
    console.log("🔐 Login request received:", {
      email: req.body.email,
      passwordLength: req.body.password?.length
    });

    try {
      const data = LoginDto.parse(req.body);
      console.log("✅ Login data validated");
      
      const result = await authService.login(
        data.email.toLowerCase().trim(),
        data.password
      );

      console.log("✅ Login successful");
      
      // Return success response
      res.json({
        success: true,
        message: "Login successful",
        data: {
          token: result.token,
          user: result.user
        }
      });

    } catch (err: any) {
      console.error("❌ Login error:", err);
      
      if (err.errors) {
        return res.status(400).json({ 
          success: false,
          message: "Validation error", 
          errors: err.errors 
        });
      }
      
      res.status(401).json({ 
        success: false,
        message: err.message || "Login failed" 
      });
    }
  }
}