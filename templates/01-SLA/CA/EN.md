# SERVICE LEVEL AGREEMENT

**Document:** LexForge™ SLA — Canada (Federal / Saskatchewan)
**Transaction ID:** {{TRANSACTION_ID}}
**Effective Date:** {{EFFECTIVE_DATE}}
**Issued By:** {{ISSUED_BY}}
**Buyer Wallet:** {{BUYER_WALLET}}

---

## PARTIES

This Service Level Agreement ("SLA") is entered into as of **{{EFFECTIVE_DATE}}** by and between:

**Service Provider:**
{{PROVIDER_NAME}}
{{PROVIDER_ADDRESS}}
("Provider")

**Customer:**
{{CUSTOMER_NAME}}
{{CUSTOMER_ADDRESS}}
("Customer")

This SLA supplements and is incorporated into the Master Service Agreement or other governing agreement between the Parties (the "Underlying Agreement"). Capitalized terms not defined herein have the meanings given in the Underlying Agreement.

---

## 1. SERVICE DESCRIPTION

The Provider shall provide the following services ("Services"):

{{SERVICE_DESCRIPTION}}

---

## 2. SERVICE AVAILABILITY

2.1 **Target Uptime.** The Provider commits to maintaining Service availability of at least **{{UPTIME_TARGET|99.5%}}** per calendar month, measured as:

```
Availability % = ((Total Minutes - Downtime Minutes) / Total Minutes) × 100
```

2.2 **Scheduled Maintenance.** Scheduled maintenance shall not count as downtime, provided the Provider gives the Customer at least **{{MAINTENANCE_NOTICE_HOURS|48}} hours**' advance notice. Scheduled maintenance windows are: {{MAINTENANCE_WINDOW|Sundays 02:00–06:00 MT}}.

2.3 **Exclusions from Downtime Calculation.** Downtime does not include unavailability caused by:
  (a) Customer's acts or omissions;
  (b) Third-party services or infrastructure outside the Provider's control;
  (c) Force majeure events;
  (d) Scheduled maintenance as defined above;
  (e) Customer's failure to use the Service in accordance with applicable documentation.

---

## 3. PERFORMANCE METRICS

| Metric | Target | Measurement Period |
|--------|--------|--------------------|
| Availability | {{UPTIME_TARGET|99.5%}} | Monthly |
| API response time (P95) | < {{API_P95_MS|500}}ms | Weekly average |
| API response time (P99) | < {{API_P99_MS|1000}}ms | Weekly average |
| Error rate | < {{ERROR_RATE|0.1%}} | Monthly |

---

## 4. INCIDENT MANAGEMENT

### 4.1 Severity Levels

| Severity | Definition | Initial Response | Resolution Target |
|----------|------------|-----------------|-------------------|
| Critical (P1) | Complete Service outage or data loss | {{P1_RESPONSE|15 minutes}} | {{P1_RESOLUTION|4 hours}} |
| High (P2) | Major feature unavailable, significant performance degradation | {{P2_RESPONSE|1 hour}} | {{P2_RESOLUTION|8 hours}} |
| Medium (P3) | Non-critical feature impaired | {{P3_RESPONSE|4 hours}} | {{P3_RESOLUTION|48 hours}} |
| Low (P4) | Minor issue, workaround available | {{P4_RESPONSE|1 business day}} | {{P4_RESOLUTION|5 business days}} |

4.2 **Reporting.** Incidents may be reported via: {{INCIDENT_REPORTING_CHANNEL}}. The Provider shall acknowledge all incidents within the response times above.

4.3 **Communication.** For P1 and P2 incidents, the Provider shall provide status updates at minimum every **{{UPDATE_INTERVAL|30}} minutes** until resolution.

4.4 **Post-Incident Review.** For P1 incidents, the Provider shall deliver a post-incident report within **{{PIR_DAYS|5}} business days** detailing root cause, impact, and corrective actions.

---

## 5. SUPPORT SERVICES

5.1 **Support Hours:** {{SUPPORT_HOURS|Monday–Friday, 9:00 AM–5:00 PM Mountain Time, excluding Canadian statutory holidays}}

5.2 **Support Channels:**
  - Email: {{SUPPORT_EMAIL}}
  - Ticketing system: {{SUPPORT_PORTAL}}

5.3 **Dedicated Contact:** {{DEDICATED_CONTACT|Not applicable}}

---

## 6. SERVICE CREDITS

6.1 If the Provider fails to meet the Uptime Target in any calendar month, the Customer shall be eligible for the following Service Credits:

| Monthly Availability | Credit (% of Monthly Fee) |
|---------------------|--------------------------|
| 99.0% – {{UPTIME_TARGET|99.5%}} | {{CREDIT_TIER_1|10%}} |
| 95.0% – 99.0% | {{CREDIT_TIER_2|25%}} |
| Below 95.0% | {{CREDIT_TIER_3|50%}} |

6.2 **Claim Process.** The Customer must submit a credit claim within **{{CREDIT_CLAIM_DAYS|15}} days** of the end of the affected month, with supporting documentation.

6.3 **Maximum Credit.** Total Service Credits in any month shall not exceed **{{MAX_CREDIT|50%}}** of the monthly fee for that month.

6.4 **Sole Remedy.** Service Credits are the Customer's sole and exclusive remedy for Provider's failure to meet service levels.

---

## 7. MONITORING AND REPORTING

7.1 The Provider shall maintain monitoring systems to measure Service performance.

7.2 The Provider shall provide the Customer with: (a) real-time status dashboard access at {{STATUS_PAGE_URL}}; (b) monthly availability reports within **{{REPORT_DAYS|5}} business days** after month end.

---

## 8. CHANGE MANAGEMENT

8.1 The Provider shall provide at least **{{CHANGE_NOTICE_DAYS|14}} days**' notice before implementing material changes to the Service that may affect performance or the Customer's systems.

8.2 Emergency changes required to restore service or address security vulnerabilities are exempt from advance notice requirements, but must be communicated as soon as practicable.

---

## 9. REVIEW AND AMENDMENTS

The Parties shall review this SLA at least annually and may amend it by written agreement. Either Party may request a review at any time if Service requirements materially change.

---

## 10. GOVERNING LAW

This SLA is governed by the laws of the Province of Saskatchewan and the federal laws of Canada, as supplemented by the Underlying Agreement.

---

## SIGNATURES

**SERVICE PROVIDER**

Signature: ___________________________
Name: {{PROVIDER_SIGNATORY}}
Title: {{PROVIDER_TITLE}}
Date: {{EFFECTIVE_DATE}}

**CUSTOMER**

Signature: ___________________________
Name: {{CUSTOMER_SIGNATORY}}
Title: {{CUSTOMER_TITLE}}
Date: {{EFFECTIVE_DATE}}

---

*LexForge™ Document ID: {{TRANSACTION_ID}} | {{JURISDICTION}} | {{LANGUAGE}}*

---

> **⚠️ LEGAL DISCLAIMER — PLEASE READ**
>
> This document was generated by **LexForge™**, an automated legal document generation service operated by Archer Chain Analytics (ISC: 102237785). It is provided as a **draft template only** and does **not** constitute legal advice.
>
> This document has not been reviewed by a licensed legal professional. Laws and regulations vary by jurisdiction and change over time. Before signing or relying on this document, you should obtain independent legal advice from a qualified lawyer licensed in the applicable jurisdiction.
>
> Archer Chain Analytics expressly disclaims all liability arising from the use of this document without independent legal review.
>
> *Sovereignty // Integrity // Inexorabilis*
