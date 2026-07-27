// app/(screens)/certifications.js
import { useState, useEffect, useCallback } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  Alert, RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "../../src/hooks/i18n/index.js";
import { useProfile } from "../../src/hooks/useProfile";
import { getCertifications, createCertification, updateCertification, deleteCertification } from "../../src/lib/db";
import { Card, Btn, Badge, EmptyState, Spinner, Sheet, Field, Input } from "../../src/components/UI";
import { T, SS, fmtDate } from "../../src/styles/tokens";

const COMMON = [
  { name:"18th Edition Wiring Regulations",         body:"NICEIC / City & Guilds" },
  { name:"NICEIC Approved Contractor",              body:"NICEIC" },
  { name:"Gas Safe Registered",                     body:"Gas Safe Register" },
  { name:"EV Charging Installation (C&G 2919)",     body:"City & Guilds" },
  { name:"IPAF Powered Access Licence",             body:"IPAF" },
  { name:"CSCS Card (Electrotechnical)",            body:"CSCS" },
  { name:"Part P Building Regulations",             body:"NAPIT / NICEIC" },
  { name:"First Aid at Work",                       body:"HSE" },
];

function daysUntil(d) {
  if (!d) return null;
  return Math.ceil((new Date(d) - new Date()) / (1000*60*60*24));
}

function ExpiryBadge({ expiry, t }) {
  const d = daysUntil(expiry);
  if (d === null)  return <Badge color="green">{t("certifications.badge.noExpiry")}</Badge>;
  if (d < 0)       return <Badge color="red">{t("certifications.badge.expired")}</Badge>;
  if (d <= 30)     return <Badge color="red">{t("certifications.badge.expiresDays", { count: d })}</Badge>;
  if (d <= 90)     return <Badge color="amber">{t("certifications.badge.expiresMonths", { count: Math.ceil(d/30) })}</Badge>;
  return <Badge color="green">{t("certifications.badge.valid")}</Badge>;
}

export default function CertificationsScreen() {
  const { t }       = useTranslation();
  const insets      = useSafeAreaInsets();
  const { profile } = useProfile();
  const [certs,    setCerts]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [refreshing,setRefreshing] = useState(false);
  const [sheet,    setSheet]    = useState(null); // null | "add" | cert obj
  const [form,     setForm]     = useState({});
  const [saving,   setSaving]   = useState(false);

  const load = useCallback(async (refresh=false) => {
    if (!profile?.id) return;
    if (refresh) setRefreshing(true); else setLoading(true);
    const { data } = await getCertifications(profile.id);
    setCerts(data??[]);
    if (refresh) setRefreshing(false); else setLoading(false);
  }, [profile?.id]);

  useEffect(() => { load(); }, [load]);

  const active  = certs.filter(c => daysUntil(c.expiry_date) === null || daysUntil(c.expiry_date) >= 0);
  const expired = certs.filter(c => daysUntil(c.expiry_date) !== null && daysUntil(c.expiry_date) < 0);
  const expiring= active.filter(c => { const d=daysUntil(c.expiry_date); return d!==null && d<=90; });

  function openAdd(prefill={}) {
    setForm({ name:prefill.name||"", issuing_body:prefill.body||"", cert_number:"", issued_date:"", expiry_date:"" });
    setSheet("add");
  }
  function openEdit(c) { setForm({...c}); setSheet("edit"); }

  async function save() {
    if (!form.name) { Alert.alert(t("certifications.alerts.nameRequired")); return; }
    setSaving(true);
    const d    = daysUntil(form.expiry_date);
    const status = !form.expiry_date ? "active" : d < 0 ? "expired" : "active";
    if (sheet==="add") {
      const { data, error } = await createCertification(profile.id, { ...form, status });
      if (error) { Alert.alert(t("certifications.alerts.addFailed")); setSaving(false); return; }
      setCerts(prev=>[...prev, data]);
    } else {
      const { data, error } = await updateCertification(form.id, { ...form, status });
      if (error) { Alert.alert(t("certifications.alerts.updateFailed")); setSaving(false); return; }
      setCerts(prev=>prev.map(c=>c.id===form.id?data:c));
    }
    setSaving(false);
    setSheet(null);
  }

  function handleDelete(id) {
    Alert.alert(t("certifications.alerts.removeTitle"), t("certifications.alerts.removeMessage"),[
      { text:t("common.cancel"), style:"cancel" },
      { text:t("common.remove"), style:"destructive", onPress: async ()=>{
        await deleteCertification(id);
        setCerts(prev=>prev.filter(c=>c.id!==id));
      }},
    ]);
  }

  if (loading) return <Spinner/>;

  return (
    <View style={{ flex:1, backgroundColor:T.bg }}>
      <View style={{ backgroundColor:T.surface, paddingTop:insets.top+8, paddingBottom:14, paddingHorizontal:20, borderBottomWidth:1, borderBottomColor:T.border }}>
        <View style={SS.spaceBetween}>
          <Text style={{ fontSize:22, fontWeight:"900", color:T.text, letterSpacing:-0.5 }}>{t("certifications.title")}</Text>
          <Btn size="sm" onPress={()=>openAdd()}>{t("certifications.addButton")}</Btn>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding:16, paddingBottom:insets.bottom+90 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>load(true)} tintColor={T.brand}/>}>

        {/* Stats */}
        <View style={[SS.row, { gap:10, marginBottom:14 }]}>
          {[
            { label:t("certifications.stats.active"),   val:active.length,   bg:T.greenBg, color:T.green },
            { label:t("certifications.stats.expiring"), val:expiring.length, bg:T.amberBg, color:T.amber },
            { label:t("certifications.stats.expired"),  val:expired.length,  bg:T.redBg,   color:T.red   },
          ].map(m=>(
            <View key={m.label} style={{ flex:1, backgroundColor:m.bg, borderRadius:T.r.md, padding:12 }}>
              <Text style={{ fontSize:10, fontWeight:"700", color:m.color, textTransform:"uppercase", letterSpacing:0.5 }}>{m.label}</Text>
              <Text style={{ fontSize:22, fontWeight:"800", color:m.color }}>{m.val}</Text>
            </View>
          ))}
        </View>

        {/* Expiry alert */}
        {expiring.length>0 && (
          <View style={{ backgroundColor:T.amberBg, borderRadius:T.r.lg, padding:14, marginBottom:14 }}>
            <Text style={{ fontWeight:"700", color:T.amber, marginBottom:4 }}>
              {t("certifications.expiringAlert", { count: expiring.length })}
            </Text>
            <Text style={{ fontSize:12, color:T.muted }}>
              {expiring.map(c=>c.name).join(", ")}
            </Text>
          </View>
        )}

        {/* Visible on profile note */}
        <View style={{ backgroundColor:T.greenBg, borderRadius:T.r.lg, padding:12, marginBottom:14 }}>
          <Text style={{ fontSize:13, color:T.green, fontWeight:"600" }}>
            {t("certifications.visibleNote")}
          </Text>
        </View>

        {/* Active certs */}
        {active.length>0 && (
          <>
            <Text style={{ fontSize:12, fontWeight:"700", color:T.muted, textTransform:"uppercase", letterSpacing:0.5, marginBottom:10 }}>
              {t("certifications.sections.active", { count: active.length })}
            </Text>
            {active.map(c=>(
              <Card key={c.id} style={{ marginBottom:8 }}>
                <View style={SS.spaceBetween}>
                  <View style={{ flex:1, marginRight:12 }}>
                    <Text style={{ fontSize:14, fontWeight:"700", marginBottom:3 }}>{c.name}</Text>
                    <Text style={{ fontSize:12, color:T.muted }}>
                      {c.issuing_body}{c.cert_number?` · ${c.cert_number}`:""}
                    </Text>
                    {c.expiry_date && <Text style={{ fontSize:12, color:T.muted, marginTop:2 }}>{t("certifications.expiresOn", { date: new Date(c.expiry_date).toLocaleDateString("en-GB",{month:"short",year:"numeric"}) })}</Text>}
                  </View>
                  <View style={{ alignItems:"flex-end", gap:8 }}>
                    <ExpiryBadge expiry={c.expiry_date} t={t}/>
                    <View style={SS.row}>
                      <Btn size="sm" variant="ghost" onPress={()=>openEdit(c)} style={{ marginRight:6 }}>{t("common.edit")}</Btn>
                      <Btn size="sm" variant="danger" onPress={()=>handleDelete(c.id)}>✕</Btn>
                    </View>
                  </View>
                </View>
              </Card>
            ))}
          </>
        )}

        {/* Expired certs */}
        {expired.length>0 && (
          <>
            <Text style={{ fontSize:12, fontWeight:"700", color:T.red, textTransform:"uppercase", letterSpacing:0.5, marginTop:8, marginBottom:10 }}>
              {t("certifications.sections.expired", { count: expired.length })}
            </Text>
            {expired.map(c=>(
              <Card key={c.id} style={{ marginBottom:8, opacity:0.7 }}>
                <View style={SS.spaceBetween}>
                  <View style={{ flex:1 }}>
                    <Text style={{ fontSize:14, fontWeight:"700" }}>{c.name}</Text>
                    <Text style={{ fontSize:12, color:T.muted }}>{c.issuing_body}</Text>
                  </View>
                  <View style={{ alignItems:"flex-end", gap:8 }}>
                    <Badge color="red">{t("certifications.badge.expired")}</Badge>
                    <Btn size="sm" variant="danger" onPress={()=>handleDelete(c.id)}>{t("common.remove")}</Btn>
                  </View>
                </View>
              </Card>
            ))}
          </>
        )}

        {certs.length===0 && (
          <EmptyState icon="🏅" message={t("certifications.empty.message")}
            action={<Btn size="sm" onPress={()=>openAdd()}>{t("certifications.empty.action")}</Btn>}/>
        )}

        {/* Quick add common certs */}
        <Text style={{ fontSize:12, fontWeight:"700", color:T.muted, textTransform:"uppercase", letterSpacing:0.5, marginTop:16, marginBottom:10 }}>{t("certifications.quickAdd.title")}</Text>
        <View style={{ flexDirection:"row", flexWrap:"wrap", gap:8 }}>
          {COMMON.map(c=>{
            const already = certs.some(cert=>cert.name===c.name);
            return (
              <TouchableOpacity key={c.name} onPress={()=>!already&&openAdd(c)}
                style={{ paddingHorizontal:12, paddingVertical:6, borderRadius:T.r.full, borderWidth:1, borderColor:already?T.green:T.border, backgroundColor:already?T.greenBg:T.surface2 }}>
                <Text style={{ fontSize:12, fontWeight:"600", color:already?T.green:T.muted }}>
                  {already?"✓ ":""}{c.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Add / Edit sheet */}
      <Sheet visible={!!sheet} onClose={()=>setSheet(null)} title={sheet==="add"?t("certifications.sheet.addTitle"):t("certifications.sheet.editTitle")} height="80%">
        <Field label={t("certifications.fields.name")}>
          <Input value={form.name??""} onChangeText={v=>setForm(p=>({...p,name:v}))} placeholder={t("certifications.placeholders.name")} autoFocus/>
        </Field>
        <Field label={t("certifications.fields.issuingBody")}>
          <Input value={form.issuing_body??""} onChangeText={v=>setForm(p=>({...p,issuing_body:v}))} placeholder={t("certifications.placeholders.issuingBody")}/>
        </Field>
        <Field label={t("certifications.fields.certNumber")}>
          <Input value={form.cert_number??""} onChangeText={v=>setForm(p=>({...p,cert_number:v}))} placeholder={t("certifications.placeholders.certNumber")}/>
        </Field>
        <View style={[SS.row, { gap:12 }]}>
          <View style={{ flex:1 }}>
            <Field label={t("certifications.fields.issuedDate")}>
              <Input value={form.issued_date??""} onChangeText={v=>setForm(p=>({...p,issued_date:v}))} placeholder={t("certifications.placeholders.dateFormat")}/>
            </Field>
          </View>
          <View style={{ flex:1 }}>
            <Field label={t("certifications.fields.expiryDate")}>
              <Input value={form.expiry_date??""} onChangeText={v=>setForm(p=>({...p,expiry_date:v}))} placeholder={t("certifications.placeholders.dateFormat")}/>
            </Field>
          </View>
        </View>
        <Btn onPress={save} disabled={saving} style={{ marginTop:8 }}>
          {saving?t("common.saving"):sheet==="add"?t("certifications.sheet.addButton"):t("certifications.sheet.saveButton")}
        </Btn>
      </Sheet>
    </View>
  );
}