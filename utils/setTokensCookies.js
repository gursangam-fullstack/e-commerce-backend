// REPLACE your existing setTokensCookies function with this fixed version
exports.setTokensCookies = (
  res,
  accessToken,
  refreshToken,
  accessTokenExp,
  refreshTokenExp
) => {
  try {
    const accessTokenExpDate = new Date(accessTokenExp * 1000);
    const refreshTokenExpDate = new Date(refreshTokenExp * 1000);

    console.log("setTokensCookies: Setting cookies");

    // Set access token cookie
    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
      expires: accessTokenExpDate,
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
      expires: refreshTokenExpDate, 
    });

    // Set is_auth cookie (not httpOnly, accessible to JS)
    res.cookie("is_auth", true, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
      expires: refreshTokenExpDate,
    });

    console.log("setTokensCookies: Cookies set successfully");
  } catch (error) {
    console.error("Error setting cookies:", error);
  }
};
