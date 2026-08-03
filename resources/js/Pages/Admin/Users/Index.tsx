// resources/js/Pages/Admin/Users/Index.tsx
import React, { useState } from 'react';
import { route } from 'ziggy-js';
import { Head, router } from '@inertiajs/react';
import { Shield, Users } from 'lucide-react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import FilterBar from '@/components/Admin/shared/FilterBar';
import DataTable from '@/components/Admin/shared/DataTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

export default function AdminUsersIndex({ users, allRoles, allPermissions, filters }: any) {
  const [selected, setSelected]   = useState<any>(null);
  const [tab, setTab]             = useState('roles');
  const [pickedRoles, setRoles]   = useState<string[]>([]);
  const [pickedPerms, setPerms]   = useState<string[]>([]);
  const [saving, setSaving]       = useState(false);
  const openUser = (u:any) => { setSelected(u); setRoles(u.roles.map((r:any)=>r.name)); setPerms(u.permissions.map((p:any)=>p.name)); setTab('roles'); };
  const toggle = (list:string[], set:any, v:string) => set((p:string[])=>p.includes(v)?p.filter(x=>x!==v):[...p,v]);
  const saveRoles = () => { setSaving(true); router.patch(route('admin.users.roles.update',{user:selected.id}),{roles:pickedRoles},{preserveState:true,onFinish:()=>{setSaving(false);setSelected(null);}}); };
  const savePerms = () => { setSaving(true); router.patch(route('admin.users.permissions.update',{user:selected.id}),{permissions:pickedPerms},{preserveState:true,onFinish:()=>{setSaving(false);setSelected(null);}}); };
  const columns = [
    {key:'user',header:'User',cell:(u:any)=><div><p className="font-medium">{u.name}</p><p className="text-xs text-muted-foreground">{u.email}</p></div>},
    {key:'roles',header:'Roles',cell:(u:any)=><div className="flex flex-wrap gap-1">{u.roles.length===0?<span className="text-xs text-muted-foreground">No roles</span>:u.roles.map((r:any)=><Badge key={r.id} variant="outline" className="text-[10px] capitalize">{r.name.replace('_',' ')}</Badge>)}</div>},
    {key:'direct_perms',header:'Direct Perms',cell:(u:any)=><span className="text-xs text-muted-foreground tabular-nums">{u.permissions.length}</span>},
    {key:'verified',header:'Verified',cell:(u:any)=><span className="text-xs">{u.email_verified_at?'✓':'—'}</span>},
    {key:'actions',header:'',cell:(u:any)=><Button size="sm" variant="ghost" className="h-7 text-xs text-[#137c41]" onClick={()=>openUser(u)}><Shield className="size-3.5 mr-1"/>Manage</Button>,className:'text-right'},
  ];
  return (
    <AuthenticatedLayout title="User Management" breadcrumbs={[{label:'Dashboard',href:route('admin.dashboard')},{label:'User Management'}]}>
      <Head title="User Management — Admin"/>
      <div className="space-y-4 px-4 py-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between"><h1 className="text-lg font-semibold flex items-center gap-2"><Users className="size-5 text-[#f1b418]"/>User Management</h1><span className="text-xs text-muted-foreground">{users.total} users</span></div>
        <FilterBar filters={filters} routeName="admin.users.index" config={[
          {key:'search',type:'search',label:'Search',placeholder:'Name or email…'},
          {key:'role',type:'select',label:'Role',options:allRoles.map((r:any)=>({value:r.name,label:r.name.replace('_',' ')}))},
        ]}/>
        <DataTable data={users.data} columns={columns} paginator={users} emptyMessage="No users found." emptyIcon={<Users className="size-10"/>}/>
      </div>
      <Dialog open={!!selected} onOpenChange={o=>!o&&setSelected(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle className="text-base">Manage: <span className="font-normal text-muted-foreground">{selected?.name}</span></DialogTitle></DialogHeader>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="mb-4"><TabsTrigger value="roles">Roles</TabsTrigger><TabsTrigger value="permissions">Direct Permissions</TabsTrigger></TabsList>
            <TabsContent value="roles">
              <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                {allRoles.map((r:any)=>(
                  <label key={r.id} className="flex items-center gap-2 cursor-pointer rounded-md px-2 py-1.5 hover:bg-muted/40">
                    <Checkbox checked={pickedRoles.includes(r.name)} onCheckedChange={()=>toggle(pickedRoles,setRoles,r.name)} className="data-[state=checked]:bg-[#137c41]"/>
                    <span className="text-sm capitalize">{r.name.replace('_',' ')}</span>
                  </label>
                ))}
              </div>
              <DialogFooter className="mt-4">
                <Button variant="outline" onClick={()=>setSelected(null)}>Cancel</Button>
                <Button className="bg-[#137c41] hover:bg-[#0b4b27] text-white" onClick={saveRoles} disabled={saving}>{saving?'Saving…':'Save Roles'}</Button>
              </DialogFooter>
            </TabsContent>
            <TabsContent value="permissions">
              <p className="text-xs text-muted-foreground mb-3">Direct permissions supplement the user's roles.</p>
              <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                {allPermissions.map((p:any)=>(
                  <label key={p.id} className="flex items-center gap-2 cursor-pointer rounded-md px-2 py-1.5 hover:bg-muted/40">
                    <Checkbox checked={pickedPerms.includes(p.name)} onCheckedChange={()=>toggle(pickedPerms,setPerms,p.name)} className="data-[state=checked]:bg-[#137c41]"/>
                    <span className="text-xs">{p.name}</span>
                  </label>
                ))}
              </div>
              <DialogFooter className="mt-4">
                <Button variant="outline" onClick={()=>setSelected(null)}>Cancel</Button>
                <Button className="bg-[#137c41] hover:bg-[#0b4b27] text-white" onClick={savePerms} disabled={saving}>{saving?'Saving…':'Save Permissions'}</Button>
              </DialogFooter>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </AuthenticatedLayout>
  );
}
