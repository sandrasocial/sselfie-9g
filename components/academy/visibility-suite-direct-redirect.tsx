"use client"
import { useEffect } from "react"
const routes: Record<string,string>={"#step-01":"/academy/what_to_say","#step-02":"/academy/show_up","#step-03":"/academy/get_paid"}
export function VisibilitySuiteDirectRedirect(){useEffect(()=>{const destination=routes[window.location.hash];if(destination)window.location.replace(destination)},[]);return null}
