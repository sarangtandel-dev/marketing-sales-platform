# Keep one Brevo record per Lead

Status: ready-for-human
Source: audit research, ADR-0036, 2026-09-28

## Problem

A second enquiry from the same email updates only the Lead details on the existing contact; its message is only in the Lead Log (90 days) and the owner's alert.

## To decide

Create a Brevo Deal (or event) keyed by lead ID for every Lead, linked to the contact. Evaluate Twenty CRM only if Brevo's CRM is outgrown.

**Module 2**.
