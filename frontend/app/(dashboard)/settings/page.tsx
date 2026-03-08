"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Loader2,
  Save,
  Image as ImageIcon,
  Type,
  FileText,
  Layout,
  Trash2,
  Eye,
  Settings as SettingsIcon,
  Palette
} from "lucide-react";
import { settingsApi, clientApi } from "@/lib/api";
import { toast } from "sonner";
import { UserSettings } from "@/lib/types";

interface InvoiceElement {
  id: string;
  type: "logo" | "letterhead" | "footer" | "text" | "company_info";
  content: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize?: number;
  fontWeight?: string;
  color?: string;
  align?: "left" | "center" | "right";
}

interface InvoiceTheme {
  id: string;
  name: string;
  description: string;
  elements: InvoiceElement[];
  backgroundColor?: string;
  accentColor: string;
}

// Predefined Professional Invoice Themes
const INVOICE_THEMES: InvoiceTheme[] = [
  {
    id: "modern-green",
    name: "Modern Green",
    description: "Clean and professional design with green accents and geometric shapes",
    accentColor: "#10b981",
    backgroundColor: "#ffffff",
    elements: [
      {
        id: "logo",
        type: "logo",
        content: "",
        x: 60,
        y: 110,
        width: 120,
        height: 60,
      },
      {
        id: "company-info",
        type: "company_info",
        content: "{{COMPANY_NAME}}",
        x: 60,
        y: 180,
        width: 200,
        height: 50,
        fontSize: 11,
        fontWeight: "bold",
        color: "#1f2937",
        align: "left"
      },
      {
        id: "letterhead",
        type: "letterhead",
        content: "INVOICE",
        x: 550,
        y: 140,
        width: 180,
        height: 60,
        fontSize: 48,
        fontWeight: "bold",
        color: "#1f2937",
        align: "right"
      },
      {
        id: "footer",
        type: "footer",
        content: "Thank you for your business!",
        x: 60,
        y: 1050,
        width: 680,
        height: 30,
        fontSize: 10,
        color: "#6b7280",
        align: "center"
      }
    ]
  },
  {
    id: "geometric-purple",
    name: "Geometric Purple",
    description: "Modern geometric design with purple and navy blue diagonal shapes",
    accentColor: "#7c3aed",
    backgroundColor: "#f9fafb",
    elements: [
      {
        id: "invoice-to-label",
        type: "text",
        content: "INVOICE TO:",
        x: 60,
        y: 250,
        width: 150,
        height: 20,
        fontSize: 10,
        fontWeight: "bold",
        color: "#1f2937",
        align: "left"
      },
      {
        id: "client-name",
        type: "text",
        content: "{{CLIENT_NAME}}",
        x: 60,
        y: 270,
        width: 200,
        height: 25,
        fontSize: 16,
        fontWeight: "bold",
        color: "#1f2937",
        align: "left"
      },
      {
        id: "date-label",
        type: "text",
        content: "Date: {{INVOICE_DATE}}",
        x: 300,
        y: 250,
        width: 150,
        height: 20,
        fontSize: 10,
        color: "#6b7280",
        align: "center"
      },
      {
        id: "invoice-number",
        type: "text",
        content: "Invoice No: {{INVOICE_NUMBER}}",
        x: 300,
        y: 270,
        width: 150,
        height: 20,
        fontSize: 10,
        color: "#6b7280",
        align: "center"
      },
      {
        id: "total-due-label",
        type: "text",
        content: "TOTAL DUE:",
        x: 550,
        y: 250,
        width: 180,
        height: 20,
        fontSize: 10,
        fontWeight: "bold",
        color: "#1f2937",
        align: "right"
      },
      {
        id: "total-amount",
        type: "text",
        content: "USD: $ {{TOTAL}}",
        x: 550,
        y: 270,
        width: 180,
        height: 25,
        fontSize: 16,
        fontWeight: "bold",
        color: "#1f2937",
        align: "right"
      },
      {
        id: "letterhead",
        type: "letterhead",
        content: "Invoice",
        x: 300,
        y: 130,
        width: 200,
        height: 60,
        fontSize: 52,
        fontWeight: "bold",
        color: "#1f2937",
        align: "center"
      },
      {
        id: "payment-method-label",
        type: "text",
        content: "Payment Method",
        x: 60,
        y: 950,
        width: 150,
        height: 20,
        fontSize: 10,
        fontWeight: "bold",
        color: "#6b7280",
        align: "left"
      },
      {
        id: "bank-details",
        type: "text",
        content: "Bank Name: Reallygreatsite\nAccount No: 1234567890",
        x: 60,
        y: 975,
        width: 200,
        height: 40,
        fontSize: 9,
        color: "#6b7280",
        align: "left"
      },
      {
        id: "logo",
        type: "logo",
        content: "",
        x: 60,
        y: 50,
        width: 100,
        height: 50,
      },
      {
        id: "company-info",
        type: "company_info",
        content: "Your Company Name",
        x: 60,
        y: 105,
        width: 200,
        height: 20,
        fontSize: 10,
        color: "#6b7280",
        align: "left"
      }
    ]
  }
];

export default function InvoiceTemplateEditor() {
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [settings, setSettings] = useState<UserSettings | null>(null);

  // Theme state
  const [selectedTheme, setSelectedTheme] = useState<string>("modern-green");

  // Template editor state
  const [elements, setElements] = useState<InvoiceElement[]>(INVOICE_THEMES[0].elements);

  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [draggingElement, setDraggingElement] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  // Company data state
  const [companyName, setCompanyName] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [companyPhone, setCompanyPhone] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [taxId, setTaxId] = useState("");
  const [defaultCurrency, setDefaultCurrency] = useState("USD");

  // Preview client data
  const [clients, setClients] = useState<any[]>([]);
  const [previewClientId, setPreviewClientId] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState({
    clientName: "DILUC STEINER",
    invoiceNumber: "INV-12345",
    invoiceDate: "12/07/2021",
    dueDate: "01/07/2022",
    subtotal: "1,350.00",
    tax: "150.00",
    total: "1,500.00"
  });

  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadSettings();
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      const data = await clientApi.list(1, 100, true);
      console.log("Loaded clients:", data);
      if (data.clients) {
        setClients(data.clients);
        console.log("Set clients state:", data.clients);
      }
    } catch (error) {
      console.error("Error loading clients:", error);
    }
  };

  const handlePreviewClientChange = (clientId: string) => {
    setPreviewClientId(clientId);
    const client = clients.find(c => c.id === clientId);
    if (client) {
      setPreviewData({
        clientName: client.name || client.business_name || "Client Name",
        invoiceNumber: "INV-" + Math.floor(100000 + Math.random() * 900000),
        invoiceDate: new Date().toLocaleDateString(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
        subtotal: "1,350.00",
        tax: "150.00",
        total: "1,500.00"
      });
    }
  };

  // Function to replace placeholders in element content
  const replacePlaceholders = (content: string): string => {
    return content
      .replace(/\{\{CLIENT_NAME\}\}/g, previewData.clientName)
      .replace(/\{\{INVOICE_NUMBER\}\}/g, previewData.invoiceNumber)
      .replace(/\{\{INVOICE_DATE\}\}/g, previewData.invoiceDate)
      .replace(/\{\{DUE_DATE\}\}/g, previewData.dueDate)
      .replace(/\{\{SUBTOTAL\}\}/g, previewData.subtotal)
      .replace(/\{\{TAX\}\}/g, previewData.tax)
      .replace(/\{\{TOTAL\}\}/g, previewData.total)
      .replace(/\{\{COMPANY_NAME\}\}/g, companyName || "Your Company Name")
      .replace(/\{\{COMPANY_ADDRESS\}\}/g, companyAddress || "123 Business Street, City")
      .replace(/\{\{COMPANY_PHONE\}\}/g, companyPhone || "(555) 123-4567")
      .replace(/\{\{COMPANY_EMAIL\}\}/g, companyEmail || "hello@company.com");
  };

  const loadSettings = async () => {
    try {
      setIsFetching(true);
      const data = await settingsApi.get();
      setSettings(data);

      if (data) {
        setCompanyName(data.company_name || "");
        setCompanyAddress(data.company_address || "");
        setCompanyPhone(data.company_phone || "");
        setCompanyEmail(data.company_email || "");
        setCompanyWebsite(data.company_website || "");
        setTaxId(data.tax_id || "");
        setDefaultCurrency(data.default_currency || "USD");

        if (data.default_template) {
          applyTheme(data.default_template);
          setSelectedTheme(data.default_template);
        }

        if (data.company_logo) {
          setLogoPreview(data.company_logo);
          setTimeout(() => {
            setElements(prev => prev.map(el =>
              el.type === "logo" ? { ...el, content: data.company_logo || "" } : el
            ));
          }, 100);
        }

        updateCompanyInfoElement(
          data.company_name || "",
          data.company_address || "",
          data.company_phone || "",
          data.company_email || ""
        );
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    } finally {
      setIsFetching(false);
    }
  };

  const applyTheme = (themeId: string) => {
    const theme = INVOICE_THEMES.find(t => t.id === themeId);
    if (theme) {
      setElements(theme.elements);
      if (logoPreview) {
        setTimeout(() => {
          setElements(prev => prev.map(el =>
            el.type === "logo" ? { ...el, content: logoPreview } : el
          ));
        }, 0);
      }
    }
  };

  const handleThemeChange = (themeId: string) => {
    setSelectedTheme(themeId);
    applyTheme(themeId);
    updateCompanyInfoElement(companyName, companyAddress, companyPhone, companyEmail);
    toast.success("Theme applied!");
  };

  const updateCompanyInfoElement = (name: string, address: string, phone: string, email: string) => {
    setElements(prev => prev.map(el => {
      if (el.type === "company_info") {
        return {
          ...el,
          content: `${name || "Your Company Name"}\n${address || "123 Business Street\nCity, State 12345"}\n${phone ? `Phone: ${phone}` : ""}\n${email || ""}`
        };
      }
      return el;
    }));
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error("Image must be less than 2MB");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setLogoPreview(base64);
        setElements(prev => prev.map(el =>
          el.type === "logo" ? { ...el, content: base64 } : el
        ));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setIsLoading(true);

      const updateData = {
        company_name: companyName || undefined,
        company_logo: logoPreview || undefined,
        company_address: companyAddress || undefined,
        company_phone: companyPhone || undefined,
        company_email: companyEmail || undefined,
        company_website: companyWebsite || undefined,
        tax_id: taxId || undefined,
        default_currency: defaultCurrency || undefined,
        default_template: selectedTheme || undefined
      };

      console.log("Saving settings:", updateData);
      await settingsApi.update(updateData);
      toast.success("Settings saved successfully");
      loadSettings();
    } catch (error: any) {
      toast.error("Failed to save settings");
      console.error("Error saving settings:", error);
      console.error("Error response:", error.response?.data);
    } finally {
      setIsLoading(false);
    }
  };

  // Drag and drop handlers
  const handleMouseDown = (e: React.MouseEvent, elementId: string) => {
    const element = elements.find(el => el.id === elementId);
    if (!element) return;

    setDraggingElement(elementId);
    setSelectedElement(elementId);

    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingElement || !previewRef.current) return;

    const previewRect = previewRef.current.getBoundingClientRect();
    const x = e.clientX - previewRect.left - dragOffset.x;
    const y = e.clientY - previewRect.top - dragOffset.y;

    setElements(prev => prev.map(el =>
      el.id === draggingElement
        ? { ...el, x: Math.max(0, Math.min(x, 750)), y: Math.max(0, Math.min(y, 1050)) }
        : el
    ));
  };

  const handleMouseUp = () => {
    setDraggingElement(null);
  };

  const updateElementProperty = (id: string, property: string, value: any) => {
    setElements(prev => prev.map(el =>
      el.id === id ? { ...el, [property]: value } : el
    ));
  };

  const addNewElement = (type: "text" | "letterhead" | "footer") => {
    const newElement: InvoiceElement = {
      id: `${type}-${Date.now()}`,
      type,
      content: type === "text" ? "New Text Block" : type === "letterhead" ? "Letterhead" : "Footer Text",
      x: 50,
      y: 300,
      width: 200,
      height: type === "text" ? 50 : 30,
      fontSize: type === "letterhead" ? 24 : 12,
      fontWeight: type === "letterhead" ? "bold" : "normal",
      color: "#000000",
      align: "left"
    };
    setElements(prev => [...prev, newElement]);
    setSelectedElement(newElement.id);
  };

  const deleteElement = (id: string) => {
    if (id === "logo" || id === "company-info") {
      toast.error("Cannot delete this element");
      return;
    }
    setElements(prev => prev.filter(el => el.id !== id));
    setSelectedElement(null);
  };

  const selectedEl = elements.find(el => el.id === selectedElement);
  const currentTheme = INVOICE_THEMES.find(t => t.id === selectedTheme);

  if (isFetching) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col p-6 bg-background">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Invoice Template Editor</h1>
          <p className="text-muted-foreground">Design your custom invoice template with drag-and-drop</p>
        </div>
        <Button onClick={handleSaveSettings} disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Template
            </>
          )}
        </Button>
      </div>

      {/* Main Editor Layout */}
      <div className="flex-1 flex gap-6 overflow-hidden">
        {/* Left Panel - Preview */}
        <div className="flex-1 flex flex-col">
          <Card className="flex-1 flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Live Preview
                </CardTitle>
                <div className="text-sm text-muted-foreground">A4 Size (210 × 297mm)</div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto">
              {/* A4 Paper Preview */}
              <div
                ref={previewRef}
                className="shadow-2xl mx-auto relative"
                style={{
                  width: "794px",
                  height: "1123px",
                  transform: "scale(0.8)",
                  transformOrigin: "top center",
                  backgroundColor: currentTheme?.backgroundColor || "#ffffff"
                }}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                {/* Grid overlay */}
                <div className="absolute inset-0 pointer-events-none opacity-10"
                  style={{
                    backgroundImage: "linear-gradient(#ccc 1px, transparent 1px), linear-gradient(90deg, #ccc 1px, transparent 1px)",
                    backgroundSize: "50px 50px"
                  }}
                />

                {/* Theme-specific styled components */}
                {selectedTheme === "modern-green" && (
                  <>
                    {/* Top green diagonal header */}
                    <div className="absolute top-0 left-0 w-full h-16 bg-gradient-to-r from-emerald-500 to-emerald-400"
                         style={{ clipPath: 'polygon(0 0, 100% 0, 75% 100%, 0% 100%)' }} />

                    {/* Bottom green footer */}
                    <div className="absolute bottom-0 left-0 w-full h-20 bg-emerald-500" />
                  </>
                )}

                {selectedTheme === "geometric-purple" && (
                  <>
                    {/* Top left navy triangle */}
                    <div className="absolute top-0 left-0 bg-indigo-950"
                         style={{ width: '80px', height: '108px', clipPath: 'polygon(0 0, 100% 30%, 0 100%)' }} />

                    {/* Top navy bar with diagonal cut */}
                    <div className="absolute top-0 left-0 w-full h-12 bg-indigo-900"
                         style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 25% 100%, 20% 85%, 15% 70%, 10% 50%, 5% 30%, 0 0)' }} />

                    {/* Top purple accent bar */}
                    <div className="absolute top-3 left-1/4 bg-violet-500"
                         style={{ width: '380px', height: '28px', clipPath: 'polygon(0 0, 95% 0, 100% 100%, 5% 100%)' }} />

                    {/* Table header */}
                    <div className="absolute top-80 left-14 right-14 h-11 bg-indigo-800 flex items-center px-4">
                      <div className="flex w-full justify-between text-white font-semibold text-sm">
                        <span style={{flex: 2}}>Description</span>
                        <span style={{flex: 1, textAlign: 'center'}}>Qty</span>
                        <span style={{flex: 1, textAlign: 'center'}}>Price</span>
                        <span style={{flex: 1, textAlign: 'right'}}>Total</span>
                      </div>
                    </div>

                    {/* Total section background */}
                    <div className="absolute right-14 bg-indigo-800 text-white px-6 py-3"
                         style={{ top: '608px', width: '240px' }}>
                      <div className="font-bold text-lg text-right">Total:</div>
                    </div>

                    {/* Bottom geometric shapes */}
                    <div className="absolute bottom-0 left-0 bg-violet-600"
                         style={{ width: '180px', height: '45px', clipPath: 'polygon(0 100%, 100% 50%, 100% 100%)' }} />

                    <div className="absolute bottom-0 left-44 bg-violet-500"
                         style={{ width: '330px', height: '70px', clipPath: 'polygon(0 40%, 100% 0, 100% 100%, 0 100%)' }} />

                    <div className="absolute bottom-0 right-0 bg-indigo-900"
                         style={{ width: '100%', height: '52px', clipPath: 'polygon(45% 0, 100% 0, 100% 100%, 0 100%, 0 60%)' }} />
                  </>
                )}

                {/* Render elements */}
                {elements.map(el => (
                  <div
                    key={el.id}
                    className={`absolute cursor-move border-2 transition-colors ${
                      selectedElement === el.id
                        ? "border-blue-500 bg-blue-50/20"
                        : "border-transparent hover:border-blue-300"
                    }`}
                    style={{
                      left: `${el.x}px`,
                      top: `${el.y}px`,
                      width: `${el.width}px`,
                      height: `${el.height}px`,
                    }}
                    onMouseDown={(e) => handleMouseDown(e, el.id)}
                    onClick={() => setSelectedElement(el.id)}
                  >
                    {el.type === "logo" && el.content && (
                      <img src={el.content} alt="Logo" className="w-full h-full object-contain" />
                    )}
                    {el.type === "logo" && !el.content && (
                      <div className="w-full h-full flex items-center justify-center bg-gray-100 border-2 border-dashed border-gray-300 rounded">
                        <ImageIcon className="h-8 w-8 text-gray-400" />
                      </div>
                    )}
                    {el.type !== "logo" && (
                      <div
                        className="w-full h-full whitespace-pre-wrap"
                        style={{
                          fontSize: `${el.fontSize}px`,
                          fontWeight: el.fontWeight,
                          color: el.color,
                          textAlign: el.align,
                          lineHeight: 1.4
                        }}
                      >
                        {replacePlaceholders(el.content)}
                      </div>
                    )}

                    {/* Selection handles */}
                    {selectedElement === el.id && (
                      <>
                        <div className="absolute -top-1 -left-1 w-2 h-2 bg-blue-500 rounded-full" />
                        <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full" />
                        <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-blue-500 rounded-full" />
                        <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-blue-500 rounded-full" />
                      </>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Panel - Properties & Tools */}
        <div className="w-96 flex flex-col gap-4 overflow-auto">
          {/* Theme Selector */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Template Theme
              </CardTitle>
              <CardDescription>Choose a professional theme or customize your own</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Select value={selectedTheme} onValueChange={handleThemeChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INVOICE_THEMES.map(theme => (
                    <SelectItem key={theme.id} value={theme.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: theme.accentColor }}
                        />
                        {theme.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {currentTheme && (
                <p className="text-xs text-muted-foreground">{currentTheme.description}</p>
              )}
            </CardContent>
          </Card>

          {/* Preview Client Selector */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Preview with Client
              </CardTitle>
              <CardDescription>Select a client to preview how the invoice will look</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Select value={previewClientId || "default"} onValueChange={handlePreviewClientChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a client..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Sample Client (Default)</SelectItem>
                  {clients.map(client => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name || client.business_name || client.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="text-xs text-muted-foreground space-y-1 p-3 bg-muted rounded">
                <div><strong>Client:</strong> {previewData.clientName}</div>
                <div><strong>Invoice #:</strong> {previewData.invoiceNumber}</div>
                <div><strong>Total:</strong> ${previewData.total}</div>
              </div>
            </CardContent>
          </Card>

          {/* Add Elements Toolbar */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Layout className="h-4 w-4" />
                Add Elements
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start" onClick={() => addNewElement("text")}>
                <Type className="mr-2 h-4 w-4" />
                Add Text Block
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => addNewElement("letterhead")}>
                <FileText className="mr-2 h-4 w-4" />
                Add Letterhead
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => addNewElement("footer")}>
                <FileText className="mr-2 h-4 w-4" />
                Add Footer
              </Button>
            </CardContent>
          </Card>

          {/* Element Properties */}
          {selectedEl && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <SettingsIcon className="h-4 w-4" />
                    Properties
                  </CardTitle>
                  {selectedEl.id !== "logo" && selectedEl.id !== "company-info" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteElement(selectedEl.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
                <CardDescription className="capitalize">{selectedEl.type.replace("_", " ")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Content */}
                {selectedEl.type !== "logo" && (
                  <div className="space-y-2">
                    <Label>Content</Label>
                    <Textarea
                      value={selectedEl.content}
                      onChange={(e) => updateElementProperty(selectedEl.id, "content", e.target.value)}
                      rows={3}
                    />
                  </div>
                )}

                {/* Position */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label>X Position</Label>
                    <Input
                      type="number"
                      value={selectedEl.x}
                      onChange={(e) => updateElementProperty(selectedEl.id, "x", parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Y Position</Label>
                    <Input
                      type="number"
                      value={selectedEl.y}
                      onChange={(e) => updateElementProperty(selectedEl.id, "y", parseInt(e.target.value) || 0)}
                    />
                  </div>
                </div>

                {/* Size */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label>Width</Label>
                    <Input
                      type="number"
                      value={selectedEl.width}
                      onChange={(e) => updateElementProperty(selectedEl.id, "width", parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Height</Label>
                    <Input
                      type="number"
                      value={selectedEl.height}
                      onChange={(e) => updateElementProperty(selectedEl.id, "height", parseInt(e.target.value) || 0)}
                    />
                  </div>
                </div>

                {/* Typography */}
                {selectedEl.type !== "logo" && (
                  <>
                    <div className="space-y-2">
                      <Label>Font Size</Label>
                      <div className="flex items-center gap-2">
                        <Slider
                          value={[selectedEl.fontSize || 12]}
                          onValueChange={(value) => updateElementProperty(selectedEl.id, "fontSize", value[0])}
                          min={6}
                          max={72}
                          step={1}
                          className="flex-1"
                        />
                        <span className="text-sm text-muted-foreground w-8">{selectedEl.fontSize}px</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Font Weight</Label>
                      <Select
                        value={selectedEl.fontWeight || "normal"}
                        onValueChange={(value) => updateElementProperty(selectedEl.id, "fontWeight", value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="bold">Bold</SelectItem>
                          <SelectItem value="lighter">Light</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Text Align</Label>
                      <Select
                        value={selectedEl.align || "left"}
                        onValueChange={(value) => updateElementProperty(selectedEl.id, "align", value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="left">Left</SelectItem>
                          <SelectItem value="center">Center</SelectItem>
                          <SelectItem value="right">Right</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Text Color</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={selectedEl.color || "#000000"}
                          onChange={(e) => updateElementProperty(selectedEl.id, "color", e.target.value)}
                          className="w-16 h-10 p-1 cursor-pointer"
                        />
                        <Input
                          type="text"
                          value={selectedEl.color || "#000000"}
                          onChange={(e) => updateElementProperty(selectedEl.id, "color", e.target.value)}
                          placeholder="#000000"
                          className="flex-1"
                        />
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Company Information Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Company Information</CardTitle>
              <CardDescription>These details will appear on your invoices</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Company Logo
                </label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="cursor-pointer"
                />
                {logoPreview && (
                  <div className="mt-2 border rounded p-2">
                    <img src={logoPreview} alt="Logo Preview" className="h-16 w-auto object-contain" />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="company-name">Company Name</Label>
                <Input
                  id="company-name"
                  value={companyName}
                  onChange={(e) => {
                    setCompanyName(e.target.value);
                    updateCompanyInfoElement(e.target.value, companyAddress, companyPhone, companyEmail);
                  }}
                  placeholder="Acme Corporation"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="company-address">Address</Label>
                <Textarea
                  id="company-address"
                  value={companyAddress}
                  onChange={(e) => {
                    setCompanyAddress(e.target.value);
                    updateCompanyInfoElement(companyName, e.target.value, companyPhone, companyEmail);
                  }}
                  placeholder="123 Business Street&#10;City, State 12345"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="company-phone">Phone</Label>
                <Input
                  id="company-phone"
                  value={companyPhone}
                  onChange={(e) => {
                    setCompanyPhone(e.target.value);
                    updateCompanyInfoElement(companyName, companyAddress, e.target.value, companyEmail);
                  }}
                  placeholder="(555) 123-4567"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="company-email">Email</Label>
                <Input
                  id="company-email"
                  type="email"
                  value={companyEmail}
                  onChange={(e) => {
                    setCompanyEmail(e.target.value);
                    updateCompanyInfoElement(companyName, companyAddress, companyPhone, e.target.value);
                  }}
                  placeholder="hello@company.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="company-website">Website</Label>
                <Input
                  id="company-website"
                  value={companyWebsite}
                  onChange={(e) => setCompanyWebsite(e.target.value)}
                  placeholder="www.company.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tax-id">Tax ID</Label>
                <Input
                  id="tax-id"
                  value={taxId}
                  onChange={(e) => setTaxId(e.target.value)}
                  placeholder="12-3456789"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="default-currency">Default Currency</Label>
                <Select value={defaultCurrency} onValueChange={setDefaultCurrency}>
                  <SelectTrigger id="default-currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                    <SelectItem value="GBP">GBP (£)</SelectItem>
                    <SelectItem value="CAD">CAD ($)</SelectItem>
                    <SelectItem value="AUD">AUD ($)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
