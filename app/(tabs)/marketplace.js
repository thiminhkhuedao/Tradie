// app/(tabs)/marketplace.js
import { useState, useEffect, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useProfile } from "../../src/hooks/useProfile";
import { getListings, createListing, expressInterest } from "../../src/lib/db";
import { useTranslation } from "../../src/hooks/i18n/index.js";
import { Card, Btn, Badge, EmptyState, Spinner, Sheet, Field, Input, SelectPicker } from "../../src/components/UI";
import { T, SS, fmt, today, uid } from "../../src/styles/tokens";
import { VERTICALS, getVerticalForProfession } from "../../src/lib/professions";

const PROFESSION_GROUPS = Object.values(VERTICALS)
  .filter(v => v.id !== "other")
  .map(v => ({ label: `${v.icon}  ${v.label}`, options: v.professions }))
  .concat([{ label: "Other", options: ["Other"] }]);

export default function MarketplaceScreen() {
  const insets      = useSafeAreaInsets();
  const { t }       = useTranslation();
  const { profile } = useProfile();
  const [listings,  setListings]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [refreshing,setRefreshing]= useState(false);
  const [typeFilter,setTypeFilter]= useState("all");
  const [detail,    setDetail]    = useState(null);
  const [postOpen,  setPostOpen]  = useState(false);
  const [interestOpen, setInterestOpen] = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [postType,  setPostType]  = useState("demand");
  const [postForm,  setPostForm]  = useState({});
  const [intForm,   setIntForm]   = useState({ name:"", email:"", phone:"", message:"" });

  const TYPE_META = {
    demand:      { icon:"🛒", label:t("marketplace.typeDemand"),      color:T.blueBg,  text:T.blue  },
    sale:        { icon:"🏪", label:t("marketplace.typeSale"),        color:T.amberBg, text:T.amber },
    recruitment: { icon:"👷", label:t("marketplace.typeRecruitment"), color:T.greenBg, text:T.green },
  };

  function timeAgo(d) {
    const days = Math.floor((Date.now() - new Date(d)) / 86400000);
    if (days === 0) return t("marketplace.today");
    if (days === 1) return t("marketplace.yesterday");
    if (days < 7)   return t("marketplace.daysAgo",{count:days});
    return t("marketplace.weeksAgo",{count:Math.floor(days/7)});
  }

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true); else setLoading(true);
    const { data } = await getListings({ type: typeFilter !== "all" ? typeFilter : undefined });
    setListings(data ?? []);
    if (refresh) setRefreshing(false); else setLoading(false);
  }, [typeFilter]);

  useEffect(() => { load(); }, [load]);

  async function handlePost() {
    if (!postForm.title || !postForm.location || !postForm.contact_email) {
      Alert.alert(t("marketplace.postRequiredFields")); return;
    }
    setSaving(true);
    const { data, error } = await createListing(profile?.id ?? null, {
      type: postType, ...postForm, status: "active",
      contact_name:  postForm.contact_name  || profile?.name  || "",
      contact_email: postForm.contact_email || profile?.email || "",
    });
    setSaving(false);
    if (error) { Alert.alert(t("marketplace.postFailed")); return; }
    setListings(prev => [data, ...prev]);
    setPostOpen(false);
    setPostForm({});
  }

  async function handleInterest() {
    if (!intForm.name || !intForm.email) { Alert.alert(t("marketplace.nameEmailRequired")); return; }
    setSaving(true);
    await expressInterest(detail.id, { ...intForm, profile_id: profile?.id ?? null });
    setSaving(false);
    setInterestOpen(false);
    setDetail(null);
    Alert.alert(t("marketplace.interestSentTitle"), t("marketplace.interestSentMessage"));
  }

  if (loading) return <Spinner />;

  const types = [["all",t("marketplace.tabAll")], ["demand",t("marketplace.tabDemands")], ["sale",t("marketplace.tabForSale")], ["recruitment",t("marketplace.tabHiring")]];

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      {/* Header */}
      <View style={{ backgroundColor: T.surface, paddingTop: insets.top + 8, paddingBottom: 14, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: T.border }}>
        <View style={SS.spaceBetween}>
          <Text style={{ fontSize: 22, fontWeight: "900", color: T.text, letterSpacing: -0.5 }}>{t("nav.marketplace")}</Text>
          <Btn size="sm" onPress={() => { setPostForm({ contact_name: profile?.name ?? "", contact_email: profile?.email ?? "" }); setPostOpen(true); }}>+ {t("marketplace.postShort")}</Btn>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
          <View style={SS.row}>
            {types.map(([id, label]) => (
              <TouchableOpacity key={id} onPress={() => setTypeFilter(id)}
                style={{ paddingHorizontal: 14, paddingVertical: 6, borderRadius: T.r.full, marginRight: 8, backgroundColor: typeFilter === id ? T.brand : T.surface2 }}>
                <Text style={{ fontSize: 13, fontWeight: "600", color: typeFilter === id ? "#fff" : T.muted }}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 90 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={T.brand}/>}
      >
        {listings.length === 0
          ? <EmptyState icon="🗂️" message={t("marketplace.noneYet")} action={<Btn size="sm" onPress={() => setPostOpen(true)}>{t("marketplace.postFirst")}</Btn>}/>
          : listings.map(l => {
              const meta = TYPE_META[l.type] ?? TYPE_META.demand;
              return (
                <TouchableOpacity key={l.id} onPress={() => setDetail(l)} activeOpacity={0.85}>
                  <Card style={{ marginBottom: 10 }}>
                    <View style={[SS.row, { marginBottom: 8, gap: 6 }]}>
                      <View style={{ backgroundColor: meta.color, borderRadius: T.r.full, paddingHorizontal: 10, paddingVertical: 3 }}>
                        <Text style={{ fontSize: 12, fontWeight: "700", color: meta.text }}>{meta.icon} {meta.label}</Text>
                      </View>
                      {l.urgent && <Badge color="red">🔥 {t("marketplace.urgent")}</Badge>}
                      <Text style={{ fontSize: 11, color: T.hint, marginLeft: "auto" }}>{timeAgo(l.created_at)}</Text>
                    </View>
                    <Text style={{ fontSize: 15, fontWeight: "700", marginBottom: 4 }} numberOfLines={2}>{l.title}</Text>
                    <Text style={{ fontSize: 13, color: T.muted, marginBottom: 10 }} numberOfLines={2}>{l.description}</Text>
                    <View style={[SS.row, { gap: 8, flexWrap: "wrap" }]}>
                      {l.trade && <Text style={{ fontSize: 12, color: T.muted }}>{getVerticalForProfession(l.trade).icon} {l.trade}</Text>}
                      {l.location && <Text style={{ fontSize: 12, color: T.muted }}>📍 {l.location}</Text>}
                      {l.budget && <Text style={{ fontSize: 13, fontWeight: "700", color: T.brand, marginLeft: "auto" }}>{fmt(l.budget)}</Text>}
                      {l.salary_range && <Text style={{ fontSize: 13, fontWeight: "700", color: T.brand, marginLeft: "auto" }}>{l.salary_range}</Text>}
                    </View>
                  </Card>
                </TouchableOpacity>
              );
            })
        }
      </ScrollView>

      {/* Listing detail sheet */}
      <Sheet visible={!!detail && !interestOpen} onClose={() => setDetail(null)} title={TYPE_META[detail?.type]?.icon + " " + (TYPE_META[detail?.type]?.label ?? "")} height="85%">
        {detail && (
          <>
            <Text style={{ fontSize: 18, fontWeight: "800", marginBottom: 8, letterSpacing: -0.3 }}>{detail.title}</Text>
            <View style={[SS.row, { gap: 10, marginBottom: 14, flexWrap: "wrap" }]}>
              {detail.trade    && <Text style={{ fontSize: 12, color: T.muted }}>{getVerticalForProfession(detail.trade).icon} {detail.trade}</Text>}
              {detail.location && <Text style={{ fontSize: 12, color: T.muted }}>📍 {detail.location}</Text>}
            </View>
            <Text style={{ fontSize: 14, color: T.muted, lineHeight: 22, marginBottom: 16 }}>{detail.description}</Text>
            {detail.budget       && <View style={[SS.spaceBetween, { marginBottom: 8 }]}><Text style={{ color: T.muted }}>{t("marketplace.budgetLabel")}</Text><Text style={{ fontWeight: "700", fontSize: 15, color: T.brand }}>{fmt(detail.budget)}</Text></View>}
            {detail.salary_range && <View style={[SS.spaceBetween, { marginBottom: 8 }]}><Text style={{ color: T.muted }}>{t("marketplace.salaryRateLabel")}</Text><Text style={{ fontWeight: "700", fontSize: 15, color: T.brand }}>{detail.salary_range}</Text></View>}
            {detail.contract_type && <View style={[SS.spaceBetween, { marginBottom: 8 }]}><Text style={{ color: T.muted }}>{t("marketplace.contractLabel")}</Text><Text style={{ fontWeight: "600" }}>{detail.contract_type}</Text></View>}
            {detail.annual_revenue && <View style={[SS.spaceBetween, { marginBottom: 8 }]}><Text style={{ color: T.muted }}>{t("marketplace.annualRevenueLabel")}</Text><Text style={{ fontWeight: "700" }}>{fmt(detail.annual_revenue)}</Text></View>}
            <View style={{ marginTop: 20 }}>
              <Btn fullWidth onPress={() => { setIntForm({ name: profile?.name ?? "", email: profile?.email ?? "", phone: profile?.phone ?? "", message: "" }); setInterestOpen(true); }}>
                ✋ {t("marketplace.imInterested")}
              </Btn>
            </View>
          </>
        )}
      </Sheet>

      {/* Interest sheet */}
      <Sheet visible={interestOpen} onClose={() => setInterestOpen(false)} title={t("marketplace.expressInterestTitle")} height="75%">
        <Field label={t("marketplace.yourNameLabel")}><Input value={intForm.name} onChangeText={v => setIntForm(p => ({...p, name: v}))} autoFocus/></Field>
        <Field label={t("marketplace.emailLabel")}><Input value={intForm.email} onChangeText={v => setIntForm(p => ({...p, email: v}))} keyboardType="email-address" autoCapitalize="none"/></Field>
        <Field label={t("marketplace.phoneLabel")}><Input value={intForm.phone} onChangeText={v => setIntForm(p => ({...p, phone: v}))} keyboardType="phone-pad"/></Field>
        <Field label={t("marketplace.messageLabel")}><Input value={intForm.message} onChangeText={v => setIntForm(p => ({...p, message: v}))} placeholder={t("marketplace.messagePlaceholder")} multiline numberOfLines={3}/></Field>
        <Btn onPress={handleInterest} disabled={saving} style={{ marginTop: 8 }}>{saving ? t("marketplace.sending") : t("marketplace.sendInterest")}</Btn>
      </Sheet>

      {/* Post listing sheet */}
      <Sheet visible={postOpen} onClose={() => setPostOpen(false)} title={t("marketplace.postAListingTitle")} height="90%">
        {/* Type selector */}
        <View style={[SS.row, { gap: 8, marginBottom: 16 }]}>
          {Object.entries(TYPE_META).map(([id, meta]) => (
            <TouchableOpacity key={id} onPress={() => setPostType(id)} style={{
              flex: 1, padding: 12, borderRadius: T.r.md, alignItems: "center",
              borderWidth: postType === id ? 2 : 1,
              borderColor: postType === id ? T.brand : T.border,
              backgroundColor: postType === id ? T.brandLight : T.surface,
            }}>
              <Text style={{ fontSize: 20 }}>{meta.icon}</Text>
              <Text style={{ fontSize: 11, fontWeight: "700", marginTop: 4, color: postType === id ? T.brand : T.muted }}>{meta.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Field label={t("marketplace.titleRequired")}><Input value={postForm.title ?? ""} onChangeText={v => setPostForm(p => ({...p, title: v}))} placeholder={t("marketplace.titlePlaceholder")} autoFocus/></Field>
        <Field label={t("marketplace.descriptionRequired")}><Input value={postForm.description ?? ""} onChangeText={v => setPostForm(p => ({...p, description: v}))} placeholder={t("marketplace.descriptionPlaceholder")} multiline numberOfLines={3}/></Field>
        <View style={[SS.row, { gap: 12 }]}>
          <View style={{ flex: 1 }}>
            <Field label={t("marketplace.professionLabel")}>
              <SelectPicker value={postForm.trade ?? "All trades"} options={[{ label: t("marketplace.anyNotSpecified"), options: ["All trades"] }, ...PROFESSION_GROUPS]} onChange={v => setPostForm(p => ({...p, trade: v}))}/>
            </Field>
          </View>
          <View style={{ flex: 1 }}>
            <Field label={t("marketplace.locationRequired")}><Input value={postForm.location ?? ""} onChangeText={v => setPostForm(p => ({...p, location: v}))} placeholder="e.g. Rouen (76)"/></Field>
          </View>
        </View>
        {postType !== "recruitment" && <Field label={postType === "sale" ? t("marketplace.askingPriceLabel") : t("marketplace.budgetFieldLabel")}><Input value={postForm.budget ?? ""} onChangeText={v => setPostForm(p => ({...p, budget: v}))} keyboardType="decimal-pad" placeholder="0"/></Field>}
        {postType === "recruitment" && <Field label={t("marketplace.salaryDayRateLabel")}><Input value={postForm.salary_range ?? ""} onChangeText={v => setPostForm(p => ({...p, salary_range: v}))} placeholder="e.g. €200–250/day"/></Field>}
        <Field label={t("marketplace.yourEmailRequired")}><Input value={postForm.contact_email ?? ""} onChangeText={v => setPostForm(p => ({...p, contact_email: v}))} keyboardType="email-address" autoCapitalize="none"/></Field>
        <Btn onPress={handlePost} disabled={saving} style={{ marginTop: 8 }}>{saving ? t("marketplace.posting") : `🚀 ${t("marketplace.postListingButton")}`}</Btn>
      </Sheet>
    </View>
  );
}
