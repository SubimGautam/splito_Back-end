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
      const data = RegisterDto.parse(req.body);
      console.log("✅ Data validated successfully");

      const result = await authService.register(
        data.username.trim(),
        data.email.toLowerCase().trim(),
        data.password
      );

      console.log("✅ Registration successful in service");

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
      
      if (err.errors) {
        return res.status(400).json({ 
          success: false,
          message: "Validation error", 
          errors: err.errors 
        });
      }
      
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

  // New: Forgot password
  async forgotPassword(req: Request, res: Response) {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ 
          success: false, 
          message: "Email is required" 
        });
      }

      await authService.forgotPassword(email);
      
      // Always return success even if email not found (security)
      res.json({ 
        success: true, 
        message: "If that email exists, a reset link has been sent." 
      });
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({ 
        success: false, 
        message: "Server error" 
      });
    }
  }

  // New: Reset password
  async resetPassword(req: Request, res: Response) {
    try {
      const { token, email, password, confirmPassword } = req.body;
      
      if (!token || !email || !password || !confirmPassword) {
        return res.status(400).json({ 
          success: false, 
          message: "All fields are required" 
        });
      }

      if (password !== confirmPassword) {
        return res.status(400).json({ 
          success: false, 
          message: "Passwords do not match" 
        });
      }

      await authService.resetPassword(token, email, password);
      
      res.json({ 
        success: true, 
        message: "Password reset successful" 
      });
    } catch (error: any) {
      console.error("Reset password error:", error);
      res.status(400).json({ 
        success: false, 
        message: error.message || "Reset failed" 
      });
    }
  }
}