import { NextResponse } from "next/server";
export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL("/login", request.url));
  response.cookies.delete("area_access_token");
  response.cookies.delete("area_mock_session");
  return response;
}
