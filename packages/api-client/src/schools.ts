import type { School, SchoolClass, SchoolInvite } from "./types";
import type { HttpClient } from "./http";

export interface SchoolsOverviewResponse extends Record<string, unknown> {
  items?: School[];
  schools?: School[];
}

export function createSchoolsClient(http: HttpClient) {
  return {
    getSchoolsOverview() {
      return http.get<SchoolsOverviewResponse>("/admin/schools/overview");
    },
    createSchool(payload: Record<string, unknown>) {
      return http.post<School>("/admin/schools", payload);
    },
    listClasses(schoolId?: string) {
      return http.get<{ items?: SchoolClass[]; classes?: SchoolClass[] } & Record<string, unknown>>("/admin/schools/classes", { query: { schoolId } });
    },
    createClass(payload: Record<string, unknown>) {
      return http.post<SchoolClass>("/admin/schools/classes", payload);
    },
    listInvites(params: { schoolId?: string; role?: string } = {}) {
      return http.get<{ items?: SchoolInvite[]; invites?: SchoolInvite[] } & Record<string, unknown>>("/admin/schools/invites", { query: params });
    },
    createInvite(payload: Record<string, unknown>) {
      return http.post<SchoolInvite>("/admin/schools/invites", payload);
    },
  };
}
