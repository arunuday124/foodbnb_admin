import React, { useState } from "react";
import { Mail, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Image from "../../assets/Background_image.svg";
import Logo from "../../assets/foodbnb.svg";
const Login_Auth = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const navigate = useNavigate();

  // Sign up form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const handleSignUp = () => {
    // Reset errors
    setEmailError("");
    setPasswordError("");

    // Validate email
    if (!email.trim()) {
      setEmailError("Email is required");
      return;
    }

    // Validate password
    if (!password.trim()) {
      setPasswordError("Password is required");
      return;
    }

    // Validate confirm password
    if (!confirmPassword.trim()) {
      setPasswordError("Please confirm your password");
      return;
    }

    // Check if passwords match
    if (password !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }

    // UI-only success (no auth)
    alert("Sign up successful!");

    // Reset form
    setEmail("");
    setPassword("");
    setConfirmPassword("");
  };

  const handleLogin = () => {
    // Just redirect to dashboard - no auth check
    navigate("/charts");
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 bg-repeat bg-center"
      style={{
        backgroundImage: `url(${Image})`,
        backgroundSize: "300px",
        backgroundColor: "#b1a2c8",
      }}>
      <div className="relative w-full max-w-4xl h-150 rounded-3xl shadow-2xl overflow-hidden">
        {/* Sign In Form - Left Side */}
        <div
          className={`absolute top-0 left-0 h-full w-1/2 flex flex-col items-center justify-center p-12 transition-all duration-700 ease-in-out z-10 bg-white ${
            isSignUp ? "translate-x-full" : "translate-x-0"
          }`}>
          <h2 className="text-3xl font-bold text-gray-800 mb-8">Sign In</h2>

          <p className="text-gray-500 text-sm mb-6">Use your email for login</p>

          <div className="w-full max-w-sm space-y-4">
            <div className="relative">
              <Mail
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                size={20}
              />
              <input
                type="email"
                placeholder="Email"
                className="w-full pl-12 pr-4 py-3 bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
              />
            </div>
            <div className="relative">
              <Lock
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                size={20}
              />
              <input
                type="password"
                placeholder="Password"
                className="w-full pl-12 pr-4 py-3 bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
              />
            </div>
            <a
              href="#"
              className="text-sm text-gray-500 hover:text-teal-500 block text-center">
              Forgot your password?
            </a>
            <button
              onClick={handleLogin}
              className="w-full py-3 bg-orange-500 text-white rounded-full font-semibold hover:bg-red-500 transition-all">
              Sign In
            </button>
          </div>
        </div>

        {/* Sign Up Form - Right Side */}
        <div
          className={`absolute top-0 right-0 h-full w-1/2 flex flex-col items-center justify-center p-12 transition-all duration-700 ease-in-out z-10 bg-white ${
            isSignUp ? "translate-x-0" : "translate-x-full"
          }`}>
          <h2 className="text-3xl font-bold text-gray-800 mb-8">
            Create Account
          </h2>

          <p className="text-gray-500 text-sm mb-6">
            or use your email for registration:
          </p>

          <div className="w-full max-w-sm space-y-4">
            <div className="relative">
              <Mail
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                size={20}
              />
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setEmailError("");
                }}
                className={`w-full pl-12 pr-4 py-3 rounded-lg focus:outline-none transition-all ${
                  emailError
                    ? "bg-red-100 focus:ring-2 focus:ring-red-500"
                    : "bg-gray-100 focus:ring-2 focus:ring-teal-500"
                }`}
              />
              {emailError && (
                <p className="text-red-500 text-sm mt-1">{emailError}</p>
              )}
            </div>
            <div className="relative">
              <Lock
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                size={20}
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setPasswordError("");
                }}
                className={`w-full pl-12 pr-4 py-3 rounded-lg focus:outline-none transition-all ${
                  passwordError
                    ? "bg-red-100 focus:ring-2 focus:ring-red-500"
                    : "bg-gray-100 focus:ring-2 focus:ring-teal-500"
                }`}
              />
            </div>
            <div className="relative">
              <Lock
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                size={20}
              />
              <input
                type="password"
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setPasswordError("");
                }}
                className={`w-full pl-12 pr-4 py-3 rounded-lg focus:outline-none transition-all ${
                  passwordError
                    ? "bg-red-100 focus:ring-2 focus:ring-red-500"
                    : "bg-gray-100 focus:ring-2 focus:ring-teal-500"
                }`}
              />
              {passwordError && (
                <p className="text-red-500 text-sm mt-1">{passwordError}</p>
              )}
            </div>
            <button
              onClick={handleSignUp}
              className="w-full py-3 bg-orange-500 text-white rounded-full font-semibold hover:bg-red-500 transition-all duration-300 uppercase tracking-wider shadow-lg hover:shadow-xl">
              Sign Up
            </button>
          </div>
        </div>

        {/* Animated Sliding Overlay Panel */}
        <div
          className={`absolute top-0 h-full w-1/2 bg-linear-to-br from-orange-400 to-orange-500 transition-all duration-700 ease-in-out z-20 flex flex-col items-center justify-center text-white p-8 ${
            isSignUp ? "left-0" : "left-1/2"
          }`}>
          {/* Decorative Circles */}
          <div className="absolute top-10 left-10 w-32 h-32 bg-white/10 rounded-full blur-2xl animate-pulse"></div>
          <div
            className="absolute bottom-20 right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl animate-pulse"
            style={{ animationDelay: "1s" }}></div>
          <div
            className="absolute top-1/2 left-1/4 w-24 h-24 bg-teal-300/20 rounded-full blur-xl animate-pulse"
            style={{ animationDelay: "0.5s" }}></div>

          <div className="relative z-10 text-center">
            <div className="mb-6">
              <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm ">
                <div className="w-24 h-24 mx-auto mb-4 mt-4">
                  <img
                    src={Logo}
                    alt="Foodbnb Logo"
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
              <h3 className="text-sm font-semibold tracking-wider">Foodbnb</h3>
            </div>

            <h1 className="text-4xl font-bold mb-4">
              {isSignUp ? "Welcome Back!" : "Create an Account!"}
            </h1>
            <p className="text-white/90 mb-8 px-4">
              {isSignUp
                ? "To see Admin features, please sign in with your account"
                : "Create an account to get started with Foodbnb Admin!"}
            </p>
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                // Reset form when switching
                setEmail("");
                setPassword("");
                setConfirmPassword("");
                setEmailError("");
                setPasswordError("");
              }}
              className="px-12 py-3 border-2 border-white rounded-full font-semibold hover:bg-white hover:text-teal-500 transition-all duration-300 uppercase tracking-wider">
              {isSignUp ? "Sign In" : "Sign Up"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login_Auth;
