export function getApiErrorMessage(error: unknown, fallback = 'Ocurrió un error inesperado'): string {
  if (typeof error === 'object' && error !== null) {
    const maybeAxios = error as {
      message?: string;
      response?: { data?: { message?: string; error?: string; errors?: { msg?: string }[] } };
    };
    const data = maybeAxios.response?.data;
    if (data?.message) return data.message;
    if (data?.error) return data.error;
    if (data?.errors?.[0]?.msg) return data.errors[0].msg;
    if (maybeAxios.message) return maybeAxios.message;
  }
  return fallback;
}
