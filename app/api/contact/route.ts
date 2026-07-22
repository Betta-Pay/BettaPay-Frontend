import { NextResponse } from "next/server";
import { z } from "zod";

// Zod validation schema
const contactSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  company: z.string().optional().or(z.literal("")),
  subject: z.enum(
    ["General", "Sales", "Technical Support", "Careers", "Partnership", "Bug Report", "Other"],
    { errorMap: () => ({ message: "Please select a valid subject." }) }
  ),
  message: z
    .string()
    .min(20, { message: "Message must be at least 20 characters." })
    .max(2000, { message: "Message must not exceed 2000 characters." }),
});

// In-memory rate limiting map (persisted on hot reload in dev)
interface RateLimitRecord {
  timestamps: number[];
}

const globalForRateLimit = global as unknown as {
  contactRateLimitMap?: Map<string, RateLimitRecord>;
};

const rateLimitMap = globalForRateLimit.contactRateLimitMap || new Map<string, RateLimitRecord>();

if (process.env.NODE_ENV !== "production") {
  globalForRateLimit.contactRateLimitMap = rateLimitMap;
}

/**
 * Checks if the IP is rate limited (max 5 submissions per hour)
 */
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip) || { timestamps: [] };

  // Filter out timestamps older than 1 hour (3600000ms)
  const oneHourAgo = now - 3600000;
  record.timestamps = record.timestamps.filter((t) => t > oneHourAgo);

  if (record.timestamps.length >= 5) {
    return false; // Rate limited
  }

  record.timestamps.push(now);
  rateLimitMap.set(ip, record);
  return true; // Allowed
}

/**
 * Verifies reCAPTCHA v3 token using Google's verify API
 */
async function verifyRecaptcha(token: string, ip: string): Promise<boolean> {
  const secretKey = process.env.RECAPTCHA_SECRET_KEY;
  if (!secretKey) {
    // If not configured, bypass verification but log warning
    return true;
  }

  if (!token) {
    return false;
  }

  try {
    const params = new URLSearchParams();
    params.append("secret", secretKey);
    params.append("response", token);
    params.append("remoteip", ip);

    const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });

    const data = await res.json();
    // Return true if Google verified it successfully and score is above 0.5
    return data.success === true && (data.score === undefined || data.score >= 0.5);
  } catch (error) {
    console.error("reCAPTCHA validation request failed:", error);
    return false;
  }
}

export async function POST(req: Request) {
  try {
    // 1. Get client IP address
    const forwarded = req.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0].trim() : "127.0.0.1";

    // 2. Enforce Rate Limiting
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "Too many submissions. Please try again in an hour." },
        { status: 429 }
      );
    }

    // 3. Parse and validate request body
    const body = await req.json();
    const { website, recaptchaToken, ...formData } = body;

    // 4. Honeypot check (bots fill hidden field; reject if it contains any value)
    if (website && website.trim() !== "") {
      console.warn(`Honeypot filled by IP ${ip}: ${website}`);
      // Return 400 Bad Request to indicate spam, but don't give away details to the bot
      return NextResponse.json({ error: "Spam submission rejected." }, { status: 400 });
    }

    // 5. Verify reCAPTCHA token if secret key is present
    if (process.env.RECAPTCHA_SECRET_KEY) {
      const isHuman = await verifyRecaptcha(recaptchaToken, ip);
      if (!isHuman) {
        console.warn(`reCAPTCHA verification failed for IP ${ip}`);
        return NextResponse.json({ error: "Failed anti-spam verification." }, { status: 400 });
      }
    }

    // 6. Validate form fields against Zod schema
    const validationResult = contactSchema.safeParse(formData);
    if (!validationResult.success) {
      const errorMessages = validationResult.error.errors.map((e) => e.message).join(" ");
      return NextResponse.json({ error: errorMessages }, { status: 400 });
    }

    const { name, email, company, subject, message } = validationResult.data;

    // 7. Store submission (database or email notification mockup)
    console.log(`[Contact Submission]
From: ${name} <${email}>
Company: ${company || "N/A"}
Subject: ${subject}
IP: ${ip}
Message: ${message}`);

    // If you ever want to connect Resend or other email dispatchers:
    // if (process.env.RESEND_API_KEY) { ... dispatch mail ... }

    return NextResponse.json({ success: true, message: "Feedback recorded." });
  } catch (error: any) {
    console.error("API contact error:", error);
    return NextResponse.json(
      { error: "Internal server error. Please try again." },
      { status: 500 }
    );
  }
}
