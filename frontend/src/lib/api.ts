/**
 * API Client — AIR & EDGE Event System
 *
 * Helper functions untuk komunikasi dengan Laravel Backend API.
 * Base URL dikonfigurasi via environment variable.
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "/api";

/**
 * Generic fetch wrapper dengan error handling.
 */
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...options.headers,
      },
      ...options,
    });

    let data: any;
    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      try {
        data = await response.json();
      } catch {
        data = { message: "Gagal membaca respon JSON dari server." };
      }
    } else {
      const text = await response.text();
      data = { message: text || `Terjadi kesalahan pada server (${response.status}).` };
    }

    if (!response.ok) {
      throw {
        status: response.status,
        message: data.message || "Terjadi kesalahan. Silakan coba lagi.",
        data: data.data || null,
      };
    }

    return data;
  } catch (error: any) {
    if (error && typeof error.status === "number") {
      throw error;
    }

    const isNetworkError =
      error?.name === "TypeError" ||
      error?.message?.includes("Load failed") ||
      error?.message?.includes("Failed to fetch") ||
      error?.message?.includes("NetworkError");

    throw {
      status: 0,
      message: isNetworkError
        ? "Koneksi terputus saat mengirim data. Silakan periksa koneksi internet Anda dan tekan tombol pendaftaran kembali."
        : error?.message || "Terjadi kesalahan koneksi.",
      data: null,
    };
  }
}

// ============================================
// Types
// ============================================

export interface Participant {
  id: number;
  ticket_id: string;
  name: string;
  email: string;
  institution: string | null;
  is_attended: boolean;
  attended_at: string | null;
  created_at: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  institution?: string;
}

export interface RegisterResponse {
  success: boolean;
  message: string;
  data: {
    id: number;
    ticket_id: string;
    name: string;
    email: string;
    institution: string | null;
  };
}

export interface ScanPayload {
  ticket_id: string;
}

export interface ScanResponse {
  success: boolean;
  message: string;
  data?: {
    name: string;
    email: string;
    institution: string | null;
    attended_at: string;
  };
}

export interface ParticipantsResponse {
  success: boolean;
  data: {
    data: Participant[];
    current_page: number;
    last_page: number;
    total: number;
  };
  stats: {
    total_registered: number;
    total_attended: number;
    attendance_rate: number;
  };
}

// ============================================
// API Functions
// ============================================

/**
 * POST /api/register — Registrasi peserta baru.
 */
export async function registerParticipant(
  payload: RegisterPayload
): Promise<RegisterResponse> {
  return apiFetch<RegisterResponse>("/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/**
 * POST /api/scan — Scan QR Code untuk absensi.
 */
export async function scanTicket(
  payload: ScanPayload
): Promise<ScanResponse> {
  return apiFetch<ScanResponse>("/scan", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/**
 * GET /api/participants — Ambil daftar peserta (admin).
 */
export async function getParticipants(
  page: number = 1,
  search: string = ""
): Promise<ParticipantsResponse> {
  const params = new URLSearchParams({
    page: String(page),
    ...(search && { search }),
  });

  return apiFetch<ParticipantsResponse>(`/participants?${params}`);
}

/**
 * POST /api/participants — Admin tambah peserta manual.
 */
export async function createParticipant(payload: {
  name: string;
  email: string;
  institution?: string;
  is_attended?: boolean;
}): Promise<{ success: boolean; message: string; data: Participant }> {
  return apiFetch<{ success: boolean; message: string; data: Participant }>("/participants", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/**
 * PUT /api/participants/{id} — Admin update peserta.
 */
export async function updateParticipant(
  id: number,
  payload: {
    name?: string;
    email?: string;
    institution?: string;
    is_attended?: boolean;
  }
): Promise<{ success: boolean; message: string; data: Participant }> {
  return apiFetch<{ success: boolean; message: string; data: Participant }>(`/participants/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

/**
 * DELETE /api/participants/{id} — Admin hapus peserta.
 */
export async function deleteParticipant(
  id: number
): Promise<{ success: boolean; message: string }> {
  return apiFetch<{ success: boolean; message: string }>(`/participants/${id}`, {
    method: "DELETE",
  });
}

/**
 * Formats ISO date string to clean Indonesian local date & time.
 * Example: "2026-08-04T03:07:25.000Z" -> "04 Agu 2026, 10:07:25 WIB"
 */
export function formatDateTime(dateStr?: string | null): string {
  if (!dateStr) return "—";
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    
    const formatted = date.toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      timeZone: "Asia/Jakarta",
    });
    
    return `${formatted.replace(/\./g, ":")} WIB`;
  } catch {
    return dateStr;
  }
}

