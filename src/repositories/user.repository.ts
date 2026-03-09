import User, { IUser } from "../models/user.model";

export class UserRepository {
  async findByEmail(email: string): Promise<IUser | null> {
    try {
      console.log(`🔍 UserRepository.findByEmail searching for: ${email}`);
      const user = await User.findOne({ email: email.toLowerCase().trim() });
      
      if (user) {
        console.log(`✅ User found: ${user.email}`);
        return user.toObject() as IUser;
      } else {
        console.log(`❌ User not found: ${email}`);
        return null;
      }
    } catch (error) {
      console.error("🔥 Error in findByEmail:", error);
      throw error;
    }
  }

  async create(data: Partial<IUser>): Promise<IUser> {
    try {
      console.log("📝 Creating user with data:", data);
      const user = new User(data);
      const savedUser = await user.save();
      return savedUser.toObject() as IUser;
    } catch (error: any) {
      console.error("❌ Error creating user:", error);
      throw error;
    }
  }

  async findById(id: string): Promise<IUser | null> {
    try {
      const user = await User.findById(id);
      return user ? user.toObject() as IUser : null;
    } catch (error) {
      console.error("❌ Error in findById:", error);
      throw error;
    }
  }

  async updateProfileImage(userId: string, imagePath: string): Promise<IUser | null> {
    try {
      console.log("🔄 Updating profile image for user:", userId);
      const user = await User.findByIdAndUpdate(
        userId,
        { profileImage: imagePath },
        { new: true }
      );
      return user ? user.toObject() as IUser : null;
    } catch (error) {
      console.error("❌ Error updating profile image:", error);
      throw error;
    }
  }

  // New methods for password reset
  async setResetToken(userId: string, tokenHash: string, expires: Date): Promise<void> {
    await User.findByIdAndUpdate(userId, {
      resetPasswordToken: tokenHash,
      resetPasswordExpires: expires
    });
  }

  async findByResetToken(tokenHash: string, email: string): Promise<IUser | null> {
    const user = await User.findOne({
      email: email.toLowerCase().trim(),
      resetPasswordToken: tokenHash,
      resetPasswordExpires: { $gt: new Date() }
    });
    return user ? user.toObject() as IUser : null;
  }

  async updatePassword(userId: string, hashedPassword: string): Promise<void> {
    await User.findByIdAndUpdate(userId, {
      password: hashedPassword,
      resetPasswordToken: null,
      resetPasswordExpires: null
    });
  }
}