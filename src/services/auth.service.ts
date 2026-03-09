import bcrypt from "bcryptjs";
import crypto from "crypto";
import { UserRepository } from "../repositories/user.repository";
import { generateToken } from "../utils/jwt";
import { sendResetCode } from "../utils/email";

const userRepo = new UserRepository();

export class AuthService {
  async register(username: string, email: string, password: string) {
    console.log("🔍 AuthService.register called");
    console.log(`   - Username: ${username}`);
    console.log(`   - Email: ${email}`);
    
    const normalizedEmail = email.toLowerCase().trim();
    
    const existingUser = await userRepo.findByEmail(normalizedEmail);
    if (existingUser) {
      console.log(`❌ User already exists: ${normalizedEmail}`);
      throw new Error("Email already exists");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await userRepo.create({
      username: username.trim(),
      email: normalizedEmail,
      password: hashedPassword,
    });

    console.log(`✅ User created successfully: ${user._id}`);
    
    const token = generateToken({
      userId: user._id,
      role: user.role || 'user',
    });

    return { 
      token,
      user: {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        role: user.role || 'user'
      }
    };
  }

  async login(email: string, password: string) {
    console.log("🔍 AuthService.login called");
    console.log(`   - Email: ${email}`);
    
    const normalizedEmail = email.toLowerCase().trim();
    
    const user = await userRepo.findByEmail(normalizedEmail);
    if (!user) {
      console.log(`❌ No user found with email: ${normalizedEmail}`);
      throw new Error("Invalid credentials");
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log(`❌ Password mismatch for: ${normalizedEmail}`);
      throw new Error("Invalid credentials");
    }

    const token = generateToken({
      userId: user._id,
      role: user.role || 'user',
    });

    return { 
      token,
      user: {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        role: user.role || 'user'
      }
    };
  }

  // New: Forgot password
  async forgotPassword(email: string): Promise<void> {
    console.log("🔍 AuthService.forgotPassword called");
    const normalizedEmail = email.toLowerCase().trim();
    const user = await userRepo.findByEmail(normalizedEmail);
    if (!user) {
      // For security, don't reveal if email exists
      console.log(`No user found with email: ${normalizedEmail}`);
      return;
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const resetExpires = new Date(Date.now() + 3600000); // 1 hour

    // Save hashed token and expiry
    await userRepo.setResetToken(user._id.toString(), resetTokenHash, resetExpires);

    // Send email with reset link (custom scheme for deep linking)
    const resetLink = `splito://reset-password?token=${resetToken}&email=${normalizedEmail}`;
    await sendResetCode(normalizedEmail, resetLink);
    console.log(`✅ Reset email sent to ${normalizedEmail}`);
  }

  // New: Reset password
  async resetPassword(token: string, email: string, newPassword: string): Promise<void> {
    console.log("🔍 AuthService.resetPassword called");
    const normalizedEmail = email.toLowerCase().trim();
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const user = await userRepo.findByResetToken(tokenHash, normalizedEmail);
    if (!user) {
      throw new Error("Invalid or expired reset token");
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password and clear reset fields
    await userRepo.updatePassword(user._id.toString(), hashedPassword);
    console.log(`✅ Password reset successful for ${normalizedEmail}`);
  }
}