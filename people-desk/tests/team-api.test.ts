import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "@/app/api/team/route";
import { readSession, safeOrigin, supabaseConfig, supabaseFetch } from "@/lib/server/supabase";

vi.mock("@/lib/server/supabase", () => ({
  readSession: vi.fn(),
  safeOrigin: vi.fn(),
  supabaseConfig: vi.fn(),
  supabaseFetch: vi.fn(),
}));

const ORG="c694dcf1-51a7-4c31-a3c4-641a4361aa2a";
const USER="17363a63-9a75-4530-94bb-1328d2c1889c";
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json"}});
const request=(data:unknown)=>new Request("https://rh-desk.onrender.com/api/team",{
  method:"POST",headers:{"Content-Type":"application/json",Origin:"https://rh-desk.onrender.com"},body:JSON.stringify(data)
});
beforeEach(()=>{
  vi.resetAllMocks();
  vi.mocked(supabaseConfig).mockReturnValue({url:"https://test.supabase.co",key:"publishable-test"});
  vi.mocked(safeOrigin).mockReturnValue(true);
  vi.mocked(readSession).mockResolvedValue({user:{id:USER,email:"admin@example.test"},accessToken:"verified-user-token"});
  vi.mocked(supabaseFetch).mockImplementation(async (path)=>{
    if(path.startsWith("/rest/v1/rh_memberships"))return json([{organization_id:ORG,role:"admin"}]);
    if(path.endsWith("rh_team_overview"))return json({members:[],invitations:[]});
    return json(true);
  });
});

describe("team administration API",()=>{
  it("rejects missing login before disclosing team membership",async()=>{
    vi.mocked(readSession).mockResolvedValue(null);
    const res=await GET();
    expect(res.status).toBe(403);
    expect(vi.mocked(supabaseFetch)).not.toHaveBeenCalled();
  });
  it("blocks recruiters from listing or modifying team membership",async()=>{
    vi.mocked(supabaseFetch).mockImplementation(async(path)=>{
      if(path.startsWith("/rest/v1/rh_memberships"))return json([{organization_id:ORG,role:"recruiter"}]);
      return json(true);
    });
    expect((await GET()).status).toBe(403);
    expect((await POST(request({action:"invite",email:"someone@example.com",role:"viewer"}))).status).toBe(403);
    expect(vi.mocked(supabaseFetch).mock.calls.every(([path])=>path.startsWith("/rest/v1/rh_memberships"))).toBe(true);
  });
  it("accepts team list only through the admin-scoped RPC with verified bearer",async()=>{
    const res=await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({members:[],invitations:[]});
    const rpc=vi.mocked(supabaseFetch).mock.calls.find(([path])=>path.endsWith("rh_team_overview"));
    expect(rpc).toBeDefined();
    expect(JSON.parse((rpc![1] as RequestInit).body as string)).toEqual({p_org:ORG});
    expect(rpc![2]).toBe("verified-user-token");
  });
  it("rejects unsafe origin before checking the login",async()=>{
    vi.mocked(safeOrigin).mockReturnValue(false);
    expect((await POST(request({action:"remove",userId:USER}))).status).toBe(403);
    expect(vi.mocked(readSession)).not.toHaveBeenCalled();
  });
  it("rejects invalid actions, roles and malformed IDs",async()=>{
    for (const payload of [
      {action:"invite",email:"bad",role:"admin"},
      {action:"invite",email:"user@example.com",role:"superadmin"},
      {action:"role",userId:"not-a-uuid",role:"admin"},
      {action:"remove",userId:"not-a-uuid"},
      {action:"unexpected",role:"admin"},
    ]) expect((await POST(request(payload))).status).toBe(400);
  });
  it("does not trust caller-supplied organization identifiers",async()=>{
    const res=await POST(request({action:"invite",email:"member@example.com",role:"viewer",p_org:"an-evil-org"}));
    expect(res.status).toBe(200);
    const rpc=vi.mocked(supabaseFetch).mock.calls.find(([path])=>path.endsWith("rh_team_invite"));
    expect(JSON.parse((rpc![1] as RequestInit).body as string)).toEqual({p_email:"member@example.com",p_role:"viewer",p_org:ORG});
  });
  it("returns a safe error when Supabase rejects privilege escalation",async()=>{
    vi.mocked(supabaseFetch).mockImplementation(async(path)=>{
      if(path.startsWith("/rest/v1/rh_memberships"))return json([{organization_id:ORG,role:"admin"}]);
      return json({code:"42501",message:"admin_required"},403);
    });
    const res=await POST(request({action:"role",userId:"d37652b8-06f6-4234-99c4-491a656296f4",role:"admin"}));
    expect(res.status).toBe(403);
  });
});
