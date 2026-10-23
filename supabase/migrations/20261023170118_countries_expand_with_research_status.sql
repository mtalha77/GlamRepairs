-- 🔴 regulator_note and data_law below are DESK RESEARCH, not legal advice.
alter table public.countries
  add column if not exists data_law text,
  add column if not exists research_status text not null default 'unverified',
  add column if not exists researched_at timestamptz,
  add column if not exists diaspora_priority smallint not null default 0;

alter table public.countries drop constraint if exists countries_research_status_check;
alter table public.countries add constraint countries_research_status_check
  check (research_status in ('unverified','desk_research','legal_advice','cleared','blocked'));

-- Pakistan is already operating. Record it before the gate goes on.
update public.countries
   set research_status = 'cleared',
       data_law = 'No comprehensive data protection act in force. PECA 2016 covers cybercrime only.',
       researched_at = now()
 where code = 'PK';

update public.countries set clients_enabled = false, practitioners_enabled = false
 where code <> 'PK';

-- 🔴 The gate. A country cannot be switched on until a lawyer has looked at it.
-- Desk research is explicitly not enough.
alter table public.countries drop constraint if exists countries_enable_needs_clearance;
alter table public.countries add constraint countries_enable_needs_clearance
  check (
    (clients_enabled = false and practitioners_enabled = false)
    or research_status in ('legal_advice','cleared')
  );

insert into public.countries
  (code,name,currency,index_standard,gdpr,data_law,regulator_note,diaspora_priority,sort_order) values
('AE','United Arab Emirates','AED','US_AQI',false,
 'Federal Decree-Law 45/2021. DIFC and ADGM have separate regimes.',
 'DHA, DOH and MOHAP license health and aesthetic practice. Aesthetics IS regulated. Verify whether remote written guidance is in scope.',10,20),
('SA','Saudi Arabia','SAR','US_AQI',false,'Personal Data Protection Law, enforced by SDAIA.',
 'MOH and SFDA regulate health practice and claims. Large Pakistani workforce.',9,21),
('QA','Qatar','QAR','US_AQI',false,'Law No. 13 of 2016 on personal data privacy.',
 'MOPH licenses health practice. Small, high income, large South Asian population.',7,22),
('KW','Kuwait','KWD','US_AQI',false,'CITRA data protection regulation.',
 'MOH licensing. Significant South Asian population.',6,23),
('BH','Bahrain','BHD','US_AQI',false,'Personal Data Protection Law 30/2018.','NHRA licenses health practice.',5,24),
('OM','Oman','OMR','US_AQI',false,'Personal Data Protection Law, Royal Decree 6/2022.','MOH licensing.',5,25),
('JO','Jordan','JOD','US_AQI',false,'Personal Data Protection Law 24/2023.','Regional aesthetics hub. Unverified.',3,26),
('EG','Egypt','EGP','US_AQI',false,
 'Law 151/2020. The Personal Data Protection Centre issued guidance in early 2026 on consent, DPOs and breach reporting.',
 'Large market, severe Cairo air quality. Licensing unverified.',4,27),

('NG','Nigeria','NGN','US_AQI',false,
 'Nigeria Data Protection Act 2023, enforced by the NDPC, replacing the 2019 NDPR. Health data is sensitive. Amendment bills pending.',
 'Largest African market. Humid climate, pigmentation concerns, high skincare spend. Licensing unverified.',8,30),
('KE','Kenya','KES','US_AQI',false,
 'Data Protection Act 2019, ODPC enforced, GDPR-like principles and DPIAs. Over 110 regulator decisions reported in 2025.',
 'Active regulator. Strong mobile payments. Licensing unverified.',6,31),
('ZA','South Africa','ZAR','US_AQI',false,'POPIA.',
 'Most developed African consumer market. Established aesthetics sector.',7,32),
('GH','Ghana','GHS','US_AQI',false,
 'Data Protection Act 2012. 🔴 A draft 2025 Act would require domestic storage of health data. Check status before enabling.',
 'Licensing unverified.',4,33),
('TZ','Tanzania','TZS','US_AQI',false,'Personal Data Protection Act 2022.','Unverified.',2,34),
('UG','Uganda','UGX','US_AQI',false,'Data Protection and Privacy Act 2019.','Unverified.',2,35),
('RW','Rwanda','RWF','US_AQI',false,'Law No. 058/2021, in force since October 2021.','Small, strong digital governance.',2,36),
('MA','Morocco','MAD','US_AQI',false,'Law 09-08.','Francophone. Needs translation.',3,37),
('ET','Ethiopia','ETB','US_AQI',false,'Personal Data Protection Proclamation.','Unverified.',1,38),

('IN','India','INR','IN_AQI',false,'Digital Personal Data Protection Act 2023.',
 '🔴 Own AQI scale. Enormous market, severe air quality.',6,40),
('BD','Bangladesh','BDT','US_AQI',false,'Draft legislation.',
 'Climate and concerns very close to Pakistan. Dhaka air quality among the worst globally.',7,41),
('LK','Sri Lanka','LKR','US_AQI',false,'Personal Data Protection Act No. 9 of 2022.','Unverified.',3,42),
('MY','Malaysia','MYR','US_AQI',false,'PDPA 2010, amended 2024.','Large Muslim market, strong K-beauty interest.',5,43),
('ID','Indonesia','IDR','US_AQI',false,'Personal Data Protection Law 27/2022.','Very large, humid, high skincare spend.',5,44),
('PH','Philippines','PHP','US_AQI',false,'Data Privacy Act of 2012.','English speaking, strong skincare market.',5,45),
('NP','Nepal','NPR','US_AQI',false,'Privacy Act 2018.','Small, similar climate.',2,46),
('TR','Turkey','TRY','EU_AQI',false,'KVKK, Law No. 6698.','Large aesthetics sector.',4,47),

('NZ','New Zealand','NZD','US_AQI',false,'Privacy Act 2020.','Small, high income, English speaking.',3,50),

('IE','Ireland','EUR','EU_AQI',true,'GDPR. Health data is Article 9 special category.',
 '🔴 GDPR. English speaking. Not before the Article 9 work is done.',4,60),
('DE','Germany','EUR','EU_AQI',true,'GDPR plus BDSG.','🔴 GDPR.',3,61),
('FR','France','EUR','EU_AQI',true,'GDPR, CNIL enforced.','🔴 GDPR. Active regulator.',3,62),
('ES','Spain','EUR','EU_AQI',true,'GDPR plus LOPDGDD.','🔴 GDPR.',2,63),
('IT','Italy','EUR','EU_AQI',true,'GDPR, Garante enforced.','🔴 GDPR.',2,64),
('NL','Netherlands','EUR','EU_AQI',true,'GDPR.','🔴 GDPR. High English fluency.',3,65),
('SE','Sweden','SEK','EU_AQI',true,'GDPR.','🔴 GDPR.',2,66),
('PL','Poland','PLN','EU_AQI',true,'GDPR.','🔴 GDPR.',2,67),

('BR','Brazil','BRL','US_AQI',false,'LGPD.','Very large aesthetics market. Portuguese.',3,70),
('MX','Mexico','MXN','US_AQI',false,'Federal data protection law.','Spanish.',2,71)
on conflict (code) do nothing;

update public.countries
   set research_status = 'desk_research', researched_at = now()
 where code <> 'PK' and research_status = 'unverified';
