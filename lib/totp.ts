import { authenticator } from "otplib";
import QRCode from "qrcode";

const ISSUER = "TestPasswordApp"; // Shown in Google Authenticator / 1Password

authenticator.options = {
    step: 30,       // 30-second period
    digits: 6,      // 6 digits
    window: 1,      // allow slight drift
};

export function createTotpSecret(email: string) {
    const secret = authenticator.generateSecret(); // base32
    const otpauth = authenticator.keyuri(email, ISSUER, secret);
    return { secret, otpauth };
}

export async function otpauthToDataURL(otpauth: string) {
    return QRCode.toDataURL(otpauth);
}

export function verifyTotp(token: string, secret: string) {
    return authenticator.verify({ token, secret });
}
