import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class MemberService {
  constructor() { }
private storage: any = null;

  setMemberData(data: any) {
    this.storage = data;
  }

  getMemberData() {
    return this.storage;
  }
}
