///////////////////////////////////////////////////////////////////////////////
// \author (c) Marco Paland (info@paland.com)
//             2016-2018, PALANDesign Hannover, Germany
//
// \license The MIT License (MIT)
//
// This file is part of phopps.
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.
//
// \brief IP phone service XML object library
//        xmlobj provides the basic xml primitive generator functions
///////////////////////////////////////////////////////////////////////////////

import * as http from 'http';


// icon item resource
var IconItemResource;

(function (IconItemResource) {
    IconItemResource["Connected"] = "Resource:Icon.Connected";
    IconItemResource["AuthenticatedCall"] = "Resource:Icon.AuthenticatedCall";
    IconItemResource["SecureCall"] = "Resource:Icon.SecureCall";
    IconItemResource["OnHook"] = "Resource:Icon.OnHook";
    IconItemResource["OffHook"] = "Resource:Icon.OffHook";
    IconItemResource["Messages"] = "Resource:Icon.Messages";
    IconItemResource["InUse"] = "Resource:Icon.InUse";
    IconItemResource["Headset"] = "Resource:Icon.Headset";
    IconItemResource["Handset"] = "Resource:Icon.Handset";
    IconItemResource["Speaker"] = "Resource:Icon.Speaker";
    IconItemResource["Locked"] = "Resource:Icon.Locked";
    IconItemResource["UnLocked"] = "Resource:Icon.UnLocked";
    IconItemResource["Checked"] = "Resource:Icon.Checked";
    IconItemResource["UnChecked"] = "Resource:Icon.UnChecked";
    IconItemResource["RadioButtonOn"] = "Resource:Icon.RadioButtonOn";
    IconItemResource["RadioButtonOff"] = "Resource:Icon.RadioButtonOff";
    IconItemResource["Ringin"] = "Resource:AnimatedIcon.Ringin";
    IconItemResource["Hold"] = "Resource:AnimatedIcon.Hold";
    IconItemResource["MessageWaiting"] = "Resource:AnimatedIcon.MessageWaiting";
    IconItemResource["StreamingRx"] = "Resource:AnimatedIcon.StreamingRx";
    IconItemResource["StreamingTx"] = "Resource:AnimatedIcon.StreamingTx";
    IconItemResource["StreamRxTx"] = "Resource:AnimatedIcon.StreamRxTx";
    IconItemResource["Throbber"] = "Resource:AnimatedIcon.Throbber";
})(IconItemResource = exports.IconItemResource || (exports.IconItemResource = {}));


export interface Device {
  vendor: string;     // vendor like 'Cisco' or 'Snom'
  w:      number;     // total width of the display
  h:      number;     // total height of the display
  imgw:   number;     // width of the image area, 0 if a status area is not available
  imgh:   number;     // height of the image area, 0 if a status area is not available
  sw:     number;     // width of the status area, 0 if a status area is not available
  sh:     number;     // height of the status area, 0 if a status area is not available
  color:  boolean;    // true for a color display
  dep:    number;     // color depth of the display in bits
  keys:   number;     // number of available softkeys
}

interface Model {
  [name: string]: Device;
}

export interface SoftKey {
  name:     string;
  url:      string;
  position: number;
  urldown?: string;
  label?:   string;
  softkey?: string;
}

export interface MenuItem {
  name:     string;
  url:      string;
  icon:     string;
  touch?: {
    top:    number;
    left:   number;
    right:  number;
    bottom: number;
  };
}

interface IconItem {
  index:    string;
  url:      string;
}

interface InputItem {
  name:     string;
  param:    string;
  default:  string;
  flags:    string;
}

interface DirectoryItem {
  name:     string;
  phone:    string;
}


export class XmlObj {

  private encoding: string;
  private model: Model;

  constructor() {
    /**
     * This object contains the specific phone model hardware data
     * w    : total width of the display
     * h    : total height of the display
     * imgw : width of the image area, 0 if a status area is not available
     * imgh : height of the image area, 0 if a status area is not available
     * sw   : width of the status area, 0 if a status area is not available
     * sh   : height of the status area, 0 if a status area is not available
     * color: true for a color display
     * dep  : color depth of the display in bits
     * keys : number of available softkeys
     */
    this.model = {
        // Cisco 6900 models
        "SPA525": { vendor: "Cisco", w: 320, h: 240, imgw: 100, imgh: 160, sw: 414, sh: 70, color: true, dep: 24, keys: 5 },
        // Cisco 6900 models
        "6921": { vendor: "Cisco", w: 0, h: 0, imgw: 396, imgh: 81, sw: 262, sh: 50, color: false, dep: 1, keys: 5 },
        "6941": { vendor: "Cisco", w: 0, h: 0, imgw: 396, imgh: 162, sw: 262, sh: 50, color: false, dep: 1, keys: 5 },
        "6945": { vendor: "Cisco", w: 0, h: 0, imgw: 396, imgh: 162, sw: 262, sh: 50, color: false, dep: 1, keys: 5 },
        "6961": { vendor: "Cisco", w: 0, h: 0, imgw: 396, imgh: 81, sw: 262, sh: 50, color: false, dep: 1, keys: 5 },
        // Cisco 7900 models
        "7811": { vendor: "Cisco", w: 95, h: 34, imgw: 0, imgh: 0, sw: 0, sh: 0, color: false, dep: 1, keys: 2 },
        "7821": { vendor: "Cisco", w: 95, h: 34, imgw: 0, imgh: 0, sw: 0, sh: 0, color: false, dep: 1, keys: 2 },
        "7832": { vendor: "Cisco", w: 95, h: 34, imgw: 0, imgh: 0, sw: 0, sh: 0, color: false, dep: 1, keys: 2 },
        "7841": { vendor: "Cisco", w: 95, h: 34, imgw: 0, imgh: 0, sw: 0, sh: 0, color: false, dep: 1, keys: 2 },
        "7861": { vendor: "Cisco", w: 95, h: 34, imgw: 0, imgh: 0, sw: 0, sh: 0, color: false, dep: 1, keys: 2 },
        // Cisco 7900 models
        "7905": { vendor: "Cisco", w: 95, h: 34, imgw: 0, imgh: 0, sw: 0, sh: 0, color: false, dep: 1, keys: 2 },
        "7906": { vendor: "Cisco", w: 95, h: 34, imgw: 0, imgh: 0, sw: 0, sh: 0, color: false, dep: 1, keys: 2 },
        "7911": { vendor: "Cisco", w: 95, h: 34, imgw: 0, imgh: 0, sw: 0, sh: 0, color: false, dep: 1, keys: 2 },
        "7912": { vendor: "Cisco", w: 0, h: 0, imgw: 0, imgh: 0, sw: 0, sh: 0, color: false, dep: 1, keys: 2 },
        "7920": { vendor: "Cisco", w: 0, h: 0, imgw: 128, imgh: 59, sw: 0, sh: 0, color: false, dep: 1, keys: 2 },
        "7921": { vendor: "Cisco", w: 0, h: 0, imgw: 176, imgh: 140, sw: 150, sh: 50, color: true, dep: 16, keys: 2 },
        "7925": { vendor: "Cisco", w: 0, h: 0, imgw: 176, imgh: 140, sw: 150, sh: 50, color: true, dep: 16, keys: 2 },
        "7926": { vendor: "Cisco", w: 0, h: 0, imgw: 176, imgh: 140, sw: 150, sh: 50, color: true, dep: 16, keys: 2 },
        "7931": { vendor: "Cisco", w: 0, h: 0, imgw: 0, imgh: 0, sw: 0, sh: 0, color: false, dep: 1, keys: 2 },
        "7937": { vendor: "Cisco", w: 0, h: 0, imgw: 255, imgh: 128, sw: 133, sh: 65, color: false, dep: 2, keys: 2 },
        "7940": { vendor: "Cisco", w: 320, h: 196, imgw: 133, imgh: 65, sw: 106, sh: 21, color: false, dep: 2, keys: 4 },
        "7941": { vendor: "Cisco", w: 320, h: 196, imgw: 298, imgh: 144, sw: 252, sh: 50, color: false, dep: 4, keys: 4 },
        "7942": { vendor: "Cisco", w: 320, h: 196, imgw: 298, imgh: 144, sw: 252, sh: 50, color: false, dep: 4, keys: 4 },
        "7945": { vendor: "Cisco", w: 320, h: 212, imgw: 298, imgh: 156, sw: 252, sh: 50, color: true, dep: 16, keys: 4 },
        "7960": { vendor: "Cisco", w: 320, h: 196, imgw: 133, imgh: 65, sw: 106, sh: 21, color: false, dep: 2, keys: 4 },
        "7961": { vendor: "Cisco", w: 320, h: 196, imgw: 298, imgh: 144, sw: 252, sh: 50, color: false, dep: 4, keys: 4 },
        "7962": { vendor: "Cisco", w: 320, h: 196, imgw: 298, imgh: 144, sw: 252, sh: 50, color: false, dep: 4, keys: 4 },
        "7965": { vendor: "Cisco", w: 320, h: 212, imgw: 298, imgh: 156, sw: 252, sh: 50, color: true, dep: 16, keys: 4 },
        "7970": { vendor: "Cisco", w: 320, h: 212, imgw: 298, imgh: 168, sw: 262, sh: 50, color: true, dep: 12, keys: 5 },
        "7971": { vendor: "Cisco", w: 320, h: 212, imgw: 298, imgh: 168, sw: 262, sh: 50, color: true, dep: 12, keys: 5 },
        "7975": { vendor: "Cisco", w: 320, h: 216, imgw: 298, imgh: 168, sw: 262, sh: 50, color: true, dep: 16, keys: 5 },
        "comm": { vendor: "Cisco", w: 320, h: 212, imgw: 298, imgh: 168, sw: 262, sh: 50, color: true, dep: 24, keys: 5 },
        // Cisco 8800 models
        "8811": { vendor: "Cisco", w: 640, h: 480, imgw: 559, imgh: 265, sw: 414, sh: 70, color: false, dep: 10, keys: 5 },
        "8821": { vendor: "Cisco", w: 640, h: 480, imgw: 240, imgh: 215, sw: 262, sh: 50, color: true, dep: 24, keys: 5 },
        "8831": { vendor: "Cisco", w: 640, h: 480, imgw: 396, imgh: 162, sw: 262, sh: 50, color: false, dep: 1, keys: 5 },
        "8832": { vendor: "Cisco", w: 640, h: 480, imgw: 480, imgh: 128, sw: 262, sh: 50, color: true, dep: 24, keys: 5 },
        "8841": { vendor: "Cisco", w: 640, h: 480, imgw: 559, imgh: 265, sw: 414, sh: 70, color: true, dep: 24, keys: 5 },
        "8845": { vendor: "Cisco", w: 640, h: 480, imgw: 559, imgh: 265, sw: 414, sh: 70, color: true, dep: 24, keys: 5 },
        "8851": { vendor: "Cisco", w: 640, h: 480, imgw: 559, imgh: 265, sw: 414, sh: 70, color: true, dep: 24, keys: 5 },
        "8861": { vendor: "Cisco", w: 640, h: 480, imgw: 559, imgh: 265, sw: 414, sh: 70, color: true, dep: 24, keys: 5 },
        "8865": { vendor: "Cisco", w: 640, h: 480, imgw: 559, imgh: 265, sw: 414, sh: 70, color: true, dep: 24, keys: 5 },
        // Cisco 8900 models
        "8941": { vendor: "Cisco", w: 640, h: 480, imgw: 498, imgh: 289, sw: 342, sh: 73, color: true, dep: 24, keys: 5 },
        "8945": { vendor: "Cisco", w: 640, h: 480, imgw: 498, imgh: 289, sw: 342, sh: 73, color: true, dep: 24, keys: 5 },
        "8961": { vendor: "Cisco", w: 640, h: 480, imgw: 498, imgh: 289, sw: 342, sh: 73, color: true, dep: 24, keys: 5 },
        // Cisco 9900 models
        "9951": { vendor: "Cisco", w: 640, h: 480, imgw: 498, imgh: 289, sw: 342, sh: 73, color: true, dep: 24, keys: 5 },
        "9971": { vendor: "Cisco", w: 640, h: 480, imgw: 498, imgh: 289, sw: 342, sh: 73, color: true, dep: 24, keys: 5 },
        // Snom models
        "760": { vendor: "Snom", w: 320, h: 240, imgw: 498, imgh: 289, sw: 262, sh: 50, color: true, dep: 16, keys: 4 },
        "765": { vendor: "Snom", w: 320, h: 240, imgw: 498, imgh: 289, sw: 262, sh: 50, color: true, dep: 16, keys: 4 }
    };

    // use UTF-8 as default encoding
    this.encoding = "<?xml version=\"1.0\" encoding=\"utf-8\" ?>";
  }


  /**
   * Returns the model specifications
   * @param name Model name
   */
  getModelSpecs(name: string): Device {
    return this.model[name];
  }


  /**
   * CiscoIPPhoneText / SnomIPPhoneText
   * The IPPhoneText XML object displays ordinary 8-bit ASCII text on the phone display.
   * The <Text> message must not contain any control characters, except for
   * carriage returns, line feeds, and tabs. The IP Phone firmware
   * controls all other pagination and wordwrap issues.
   *
   * <CiscoIPPhoneText>
   *   <Title>Title</Title>
   *   <Prompt>Prompt</Prompt>
   *   <Text>Text</Text>
   * </CiscoIPPhoneText>
   */
  IPPhoneText(vendor: string, title: string = "", prompt: string = "", text: string, softkeys?: Array<SoftKey>): string {
    return this.encoding + this.xml(vendor + "IPPhoneText", "", (title !== "" ? this.xml("Title", title) : "") +
           (prompt !== "" ? this.xml("Prompt", prompt) : "") +
            this.xml("Text", text) +
            this.SoftKeyItem(vendor, softkeys));
  }


  /**
   * IPPhoneMenu / IPPhoneMenu
   * A menu on the phone comprises a list of text items, one per line.
   *
   * <CiscoIPPhoneMenu>
   *   <Title>Title</Title>
   *   <Prompt>Prompt</Prompt>
   *   <MenuItem>
   *     <Name>The name of each menu item</Name>
   *     <URL>The URL associated with the menu item</URL>
   *   </MenuItem>
   *   <MenuItem>
   *     <Name>The name of each menu item</Name>
   *     <URL>The URL associated with the menu item</URL>
   *   </MenuItem>
   * </CiscoIPPhoneMenu>
   */
  IPPhoneMenu(vendor: string, title: string = "", prompt: string = "", items: Array<MenuItem>, softkeys?: Array<SoftKey>): string {
    let xml = "<" + vendor + "IPPhoneMenu>" +
              (title !== "" ? this.xml("Title", title) : "") +
              (prompt !== "" ? this.xml("Prompt", prompt) : "");
    for (let i = 0; i < items.length; i++) {
      xml += this.xml("MenuItem", "", this.xml("Name", items[i].name) + this.xml("URL", items[i].url));
    }
    xml += this.SoftKeyItem(vendor, softkeys);
    xml += "</" + vendor + "IPPhoneMenu>";
    return this.encoding + xml;
  }


    /**
     * CiscoIPPhoneIconFileMenu
     * This icon menu is similar to CiscoIPPhoneMenu, but it uses *color* PNG icons
     * rather than grayscale CIP icons.
     * Use icon menus in situations when you want to provide additional visual information
     * to the user to show the state or category of an item.
     * For example, you can use icons to indicate priority
     * Icons in the CiscoIPPhoneIconFileMenu object have a maximum width of 18 pixels
     * and a maximum height of 18 pixels.
     * Instead of using the <Data> tag to embed the image data into the <IconItem> tag,
     * this object uses a <URL> tag to point to the PNG image file to be used for that icon.
     *
     * <CiscoIPPhoneIconFileMenu>
     *   <Title>Title text goes here</Title>
     *   <Prompt>Prompt text goes here</Prompt>
     *   <MenuItem>
     *     <IconIndex>Indicates what IconItem to display</IconIndex>
     *     <Name>The name of each menu item</Name>
     *     <URL>The URL associated with the menu item</URL>
     *   </MenuItem>
     *   <IconItem>
     *     <Index>A unique index from 0 to 9</Index>
     *     <URL>Location of the PNG icon image</URL>
     *   </IconItem>
     * </CiscoIPPhoneIconFileMenu>
     */
    IPPhoneIconFileMenu(vendor: string, title: string = "", prompt: string = "", items: Array<MenuItem>, icons: Array<IconItem>, softkeys?: Array<SoftKey>): string {
        let xml = "<" + vendor + "IPPhoneIconFileMenu>" +
            (title !== "" ? this.xml("Title", title) : "") +
            (prompt !== "" ? this.xml("Prompt", prompt) : "");
        for (let i = 0; i < items.length; i++) {
            xml += this.xml("MenuItem", "", this.xml("IconIndex", items[i].icon) +
                this.xml("Name", items[i].name) +
                this.xml("URL", items[i].url));
        }
        for (let i = 0; i < icons.length; i++) {
            xml += this.xml("IconItem", "", this.xml("Index", icons[i].index) +
                this.xml("URL", icons[i].url));
        }
        xml += this.SoftKeyItem(vendor, softkeys);
        xml += "</" + vendor + "IPPhoneIconFileMenu>";
        return this.encoding + xml;
    }


    /**
     * IPPhoneInput
     * When an IP Phone receives an XML object of type CiscoIPPhoneInput,
     * it constructs an input form and displays it.
     * The user then enters data into each input item and sends the parameters to the
     * target URL.
     * Maximum of five items are allowed.
     *
     *  InputFlag  Description
     *     A       Plain ASCII text, use the DTMF keypad to enter text that consists of uppercase and lowercase letters, numbers, and special characters.
     *     T       Telephone number, enter only DTMF digits for this field. The acceptable input includes numbers, #, and *.
     *     N       Numeric, enter numbers as the only acceptable input.
     *     E       Equation, enter numbers and special math symbols.
     *     U       Uppercase, enter uppercase letters as the only acceptable input.
     *     L       Lowercase, enter lowercase letters as the only acceptable input.
     *     P       Password field, enter individual characters using the standard keypad-repeat entry mode. The system automatically converts accepted characters into an asterisk, keeping the entered value private.
     *
     * <CiscoIPPhoneInput>
     *   <Title>Title</Title>
     *   <Prompt>Prompt</Prompt>
     *   <URL>The target URL for the completed input goes here</URL>
     *   <InputItem>
     *     <DisplayName>Name of the input field to display</DisplayName>
     *     <QueryStringParam>The parameter to be added to the target URL</QueryStringParam>
     *     <DefaultValue>The default display name</DefaultValue>
     *     <InputFlags>The flag specifying the type of allowable input</InputFlags>
     *   </InputItem>
     * </CiscoIPPhoneInput>
     */
    IPPhoneInput(vendor: string, title: string = "", prompt: string = "", url: string, items: Array<InputItem>): string {
        let xml = "<" + vendor + "IPPhoneInput>" +
            (title !== "" ? this.xml("Title", title) : "") +
            (prompt !== "" ? this.xml("Prompt", prompt) : "") +
            this.xml("URL", url);
        for (let i = 0; i < items.length && i < 5; i++) {
            xml += this.xml("InputItem", "", this.xml("DisplayName", items[i].name) +
                this.xml("QueryStringParam", items[i].param) +
                this.xml("DefaultValue", items[i].default || "") +
                this.xml("InputFlags", vendor === "Cisco" ? items[i].flags || "A" : (items[i].flags || "A").toLowerCase()));
        }
        xml += "</" + vendor + "IPPhoneInput>";
        return this.encoding + xml;
    }


    /**
     * IPPhoneDirectory
     *
     * <CiscoIPPhoneDirectory>
     *   <Title>Directory title goes here</Title>
     *   <Prompt>Prompt text goes here</Prompt>
     *   <DirectoryEntry>
     *     <Name>The name of the directory entry</Name>
     *     <Telephone>The telephone number for the entry</Telephone>
     *   </DirectoryEntry>
     * </CiscoIPPhoneDirectory>
     */
    IPPhoneDirectory(vendor: string, title: string = "", prompt: string = "", items: Array<DirectoryItem>, softkeys: Array<SoftKey>): string {
        let xml = "<" + vendor + "IPPhoneDirectory>" +
            (title !== "" ? this.xml("Title", title) : "") +
            (prompt !== "" ? this.xml("Prompt", prompt) : "");
        for (let i = 0; i < items.length && i < 32; i++) {
            xml += "<DirectoryEntry>";
            xml += this.xml("Name", items[i].name);
            xml += this.xml("Telephone", items[i].phone);
            xml += "</DirectoryEntry>";
        }
        xml += this.SoftKeyItem(vendor, softkeys);
        xml += "</" + vendor + "IPPhoneDirectory>";
        return this.encoding + xml;
    }


    /**
     * IPPhoneImage
     * The CiscoIPPhoneImage provides a bitmap display with a 133 x 65 pixel pane
     * that is available to access services.
     * Each pixel includes four grayscale settings.
     * A value of three (3) displays as black, and a value of zero (0) displays as white.
     * The CiscoIPPhoneImage XML type lets you use the Cisco Unified IP Phone display
     * to present graphics to the user.
     *
     * <CiscoIPPhoneImage>
     *   <Title>Image title goes here</Title>
     *   <Prompt>Prompt text goes here</Prompt>
     *   <LocationX>Position information of graphic</LocationX>
     *   <LocationY>Position information of graphic</LocationY>
     *   <Width>Size information for the graphic</Width>
     *   <Height>Size information for the graphic</Height>
     *   <Depth>Number of bits per pixel</Depth>
     *   <Data>Packed Pixel Data</Data>
     *   <SoftKeyItem>
     *     <Name>Name of the soft key</Name>
     *     <URL>URL of soft key</Name>
     *     <Position>Numerical position of the soft key</Position>
     *   </SoftKeyItem>
     * </CiscoIPPhoneImage>
     */
    /**
     * IPPhoneImageFile
     * To support more advanced displays, a new XML object allows the use of color PNG
     * images in addition to the grayscale CiscoIPPhoneImage objects.
     * The CiscoIPPhoneImageFile object behaves like the CiscoIPPhoneImage object,
     * except for the image data. Instead of using the <Data> tag to embed the image data,
     * the <URL> tag points to the PNG image file.
     * IMPORTANT: The web server must deliver the PNG image to the phone with an appropriate
     * MIME Content-Type header, such as image/png, so the phone recognizes the content
     * as a compressed, binary PNG image.
     * The PNG image can be either palettized or RGB, and the maximum image size and color
     * depth are model dependent.
     *
     * <CiscoIPPhoneImageFile WindowMode="Width Mode of XSI window">
     *   <Title>Image Title goes here</Title>
     *   <Prompt>Prompt text goes here</Prompt>
     *   <LocationX>Horizontal position of graphic</LocationX>
     *   <LocationY>Vertical position of graphic</LocationY>
     *   <URL>Points to the PNG image</URL>
     * </CiscoIPPhoneImageFile>
     */
    IPPhoneImageFile(vendor: string, title: string = "", prompt: string = "", mode: string, x: number, y: number, url: string, softkeys?: Array<SoftKey>): string {
        return this.encoding + this.xml(vendor + "IPPhoneImageFile", "", (title !== "" ? this.xml("Title", title) : "") +
            (prompt !== "" ? this.xml("Prompt", prompt) : "") +
            this.xml("LocationX", x.toString()) +
            this.xml("LocationY", y.toString()) +
            this.xml("URL", url) +
            this.SoftKeyItem(vendor, softkeys), mode === 'wide' ? "WindowMode=\"Wide\"" : "WindowMode=\"Normal\"");
    }


    /**
     * CiscoIPPhoneGraphicFileMenu - Cisco only
     *
     * <CiscoIPPhoneGraphicFileMenu WindowMode="Width Mode of XSI window">
     *   <Title>Image Title goes here</Title>
     *   <Prompt>Prompt text goes here</Prompt>
     *   <LocationX>Horizontal position of graphic</LocationX>
     *   <LocationY>Vertical position of graphic</LocationY>
     *   <URL>Points to the PNG background image</URL>
     *   <MenuItem>
     *     <Name>The name of each menu item</Name>
     *     <URL>Invoked when the TouchArea is touched</URL>
     *     <TouchArea X1="left edge" Y1="top edge" X2="right edge" Y2="bottom edge"/>
     *   </MenuItem>
     * </CiscoIPPhoneGraphicFileMenu>
     */
    IPPhoneGraphicFileMenu(vendor: string, title: string = "", prompt: string = "", mode: string, x: number, y: number, url: string, items: Array<MenuItem>, softkeys?: Array<SoftKey>): string {
        let menu = "";
        for (let i = 0; i < items.length; i++) {
            menu += this.xml("MenuItem", "", this.xml("Name", items[i].name) +
                this.xml("URL", items[i].url));
            this.xml("TouchArea", "", "", "X1=\"" + items[i].touch.left.toString() + "\" " +
                "Y1=\"" + items[i].touch.top.toString() + "\" " +
                "X2=\"" + items[i].touch.right.toString() + "\" " +
                "Y2=\"" + items[i].touch.bottom.toString() + "\"");
        }
        let xml = this.xml("CiscoIPPhoneGraphicFileMenu", "", (title !== "" ? this.xml("Title", title) : "") +
            (prompt !== "" ? this.xml("Prompt", prompt) : "") +
            this.xml("LocationX", x.toString()) +
            this.xml("LocationY", y.toString()) +
            this.xml("URL", url) +
            this.SoftKeyItem("Cisco", softkeys) +
            menu, mode === 'wide' ? "WindowMode=\"Wide\"" : "WindowMode=\"Normal\"");
        return this.encoding + xml;
    }


    // CiscoIPPhoneIconMenu
    // Icon menus serve the same purpose as text menus: they allow a user to select a
    // URL from a list. Use icon menus in situations when you want to provide additional
    // visual information to the user to show the state or category of an item.
    // For example, you include a a read and unread icon in a mail viewer.
    // You can use the icons can to convey the message state.
    // Icons in the CiscoIPPhoneMenu object have a maximum width of 16 pixels and a
    // maximum height of 10 pixels.
    /*
      CiscoIPPhoneIconMenu()
      {
      /*
      <CiscoIPPhoneIconMenu>
        <Title>Title text goes here</Title>
        <Prompt>Prompt text goes here</Prompt>
        <MenuItem>
          <IconIndex>Indicates what IconItem to display</IconIndex>
          <Name>The name of each menu item</Name>
          <URL>The URL associated with the menu item</URL>
        </MenuItem>
        <SoftKeyItem>
          <Name>Name of soft key</Name>
          <URL>URL or URI of soft key</URL>
          <Position>Position information of the soft key</Position>
        </SoftKeyItem>
        <IconItem>
          <Index>A unique index from 0 to 9</Index>
          <Height>Size information for the icon</Height>
          <Width>Size information for the icon</Width>
          <Depth>Number of bits per pixel</Depth>
          <Data>Packed Pixel Data</Data>
        </IconItem>
      </CiscoIPPhoneIconMenu>

      }
    */
    // CiscoIPPhoneStatus
    // The CiscoIPPhoneStatus object is also a displayable object, but differs from
    // the preceding objects in that it displays on the Call plane of the phone rather
    // than the Services plane.
    // The CiscoIPPhoneStatus object "hovers" above the Call plane and is typically
    // used in conjunction with CTI applications to present application status to the user.
    // Because the Status object is only present on the Call plane, the object cannot
    // be closed or cleared by the user (for example, by pressing Services).
    // In order to clear the object, the phone must execute the Init:AppStatus URI.
    // This would typically occur as the result of an application server PUSHing an
    // Execute object to the phone that contains the Init:AppStatus URI.
    // NOTE: The CiscoIPPhoneStatus object can only be pushed (HTTP POST) to the phone,
    // it cannot be pulled (HTTP GET).
    // The CiscoIPPhoneStatus object can be refreshed or replaced at any time.
    // It is not necessary to clear an existing Status object before sending
    // a new Status object. The new object simply replaces the old object.
    /*
      function CiscoIPPhoneStatus ()
      {
      /*
      <CiscoIPPhoneStatus>
        <Text>This is the text area</Text>
        <Timer>Timer seed value in seconds</Timer>
        <LocationX>Horizontal alignment</LocationX>
        <LocationY>Vertical alignment</LocationY>
        <Width>Pixel width of graphic</Width>
        <Height>Pixel height of graphic</Height>
        <Depth>Color depth in bits</Depth>
        <Data>Hex binary image data</Data>
      </CiscoIPPhoneStatus>
      */
    /**
     * CiscoIPPhoneStatusFile
     * The behavior of this object is identical to the CiscoIPPhoneStatus object,
     * except it uses a color PNG image instead of a grayscale CIP image for the
     * graphics area.
     * The maximum image size is 262 x 50 pixels for the Cisco 7970, but may be
     * different for other phone models.
     *
     * <CiscoIPPhoneStatusFile>
     *   <Text>This is the text area</Text>
     *   <Timer>Timer seed value in seconds</Timer>
     *   <LocationX>Horizontal alignment</LocationX>
     *   <LocationY>Vertical alignment</LocationY>
     *   <URL>location of the PNG image</URL>
     * </CiscoIPPhoneStatusFile>
     */
    IPPhoneStatusFile(vendor: string, text: string = "", url: string = "", x: number, y: number, timer: number, softkeys?: Array<SoftKey>): string {
        return this.encoding + this.xml(vendor + "IPPhoneStatusFile", "", (text !== "" ? this.xml("Text", text) : "") +
            (typeof timer !== "undefined" ? this.xml("Timer", timer.toString()) : "") +
            this.xml("LocationX", x.toString()) +
            this.xml("LocationY", y.toString()) +
            this.xml("URL", url) +
            this.SoftKeyItem(vendor, softkeys));
    }


  /**
   * IPPhoneExecute
   * The CiscoIPPhoneExecute object differs from the other CiscoIPPhone objects.
   * It is not a displayable object for providing user interaction. The purpose of
   * this object is to deliver (potentially multiple) execution requests to the phone.
   * Like the other XML objects, the CiscoIPPhoneExecute can be either pushed (HTTP POST)
   * or pulled (HTTP GET). Upon receiving a CiscoIPPhoneExecute object, the phone will
   * begin executing the specified ExecuteItems. Order of execution is not guaranteed,
   * so ExecuteItems will likely not execute in the order in which they are listed
   * in the CiscoIPPhoneExecute object.
   * NOTE: Limit the requests to three ExecuteItems: only one can be a URL and two URIs
   * per CiscoIPPhoneExecute object, or you can send three URIs with no URL.
   * priority: 0 = Execute Immediately
   *           1 = Execute When Idle
   *           2 = Execute If Idle
   *
   * <CiscoIPPhoneExecute>
   *   <ExecuteItem Priority="0" URL="the URL or URI to be executed" />
   * </CiscoIPPhoneExecute>
   * or
   * <CiscoIPPhoneExecute>
   *   <ExecuteItem Priority="0" URL="Play:chime.raw" />
   *   <ExecuteItem Priority="1" URL="http://server/textmessage.xml" />
   * </CiscoIPPhoneExecute>
   */
  IPPhoneExecute(vendor: string, items: Array<{ priority: number; url: string }>): string {
    let xml = "<" + vendor + "IPPhoneExecute>";
    for (let i = 0; i < items.length; i++) {
      xml += "<ExecuteItem Priority=\"" + (items[i].priority || "0") + "\" URL=\"" + this.quote(items[i].url) + "\" />";
    }
    xml += "</" + vendor + "IPPhoneExecute>";
    return this.encoding + xml;
  }


  /**
   * SoftKeyItem - Custom Softkeys
   * Cisco Unified IP Phones can use custom softkeys with any of the displayable
   * CiscoIPPhone XML objects, excluding the CiscoIPPhoneStatus object which cannot
   * control softkeys and the CiscoIPPhoneExecute object which is not displayable.
   * Softkeys can have either URL or URI "actions" associated with them.
   * The SoftkeyItem can define separate actions to be taken when the softkey is
   * pressed and released. The standard UI behavior is to execute an action when a
   * key is released, and this action is defined by the<URL> tag. An action can also
   * be taken when the softkey is initially pressed by including the optional <URLDown>
   * tag. For example, you might use <URLDown> for a press-to-talk application in which
   * pressing the button starts audio streaming and releasing the button stops it.
   * NOTE: The <URLDown> tag can only contain Internal URIs - it cannot contain an
   * HTTP URL. The "URL" in the name "URLDown" does not signify that an HTTP URL can be
   * used.
   * <SoftKeyItem>
   *   <Name>Displayed sofkey label</Name>
   *   <URL>URL or URI action for softkey RELEASE event</URL>
   *   <URLDown>URL or URI action for softkey PRESS event</URLDown>
   *   <Position>position of softkey</Position>
   * </SoftKeyItem>
   */
  SoftKeyItem(vendor: string, softkeys: Array<SoftKey> = []): string {
    let xml = "";
    for (let i = 0; i < softkeys.length; i++) {
      xml += "<SoftKeyItem>";
      xml += softkeys[i].name ? this.xml("Name", softkeys[i].name) : "";
      if (vendor === "Cisco") {
        // Cisco
        xml += softkeys[i].url ? this.xml("URL", softkeys[i].url) : "";
        xml += softkeys[i].urldown ? this.xml("URLDown", softkeys[i].urldown) : "";
        // use position
        xml += this.xml("Position", softkeys[i].position.toString());
      }
      else {
        // Snom
        if (!softkeys[i].url) {
          // use URL
          xml += this.xml("URL", softkeys[i].url);
        }
        else {
          // use label and Softkey
          xml += this.xml("Label", softkeys[i].label);
          xml += this.xml("Softkey", softkeys[i].softkey);
        }
      }
      xml += "</SoftKeyItem>";
    }
    return xml;
  }


  /**
   * setBackground - Cisco only
   * Undocumented object to set the background of a Cisco phone
   * IMPORTANT: To use this feature, <phonePersonalization>1</phonePersonalization> must be set in <device> section in the according phone config file
   *
   * <setBackground>
   *   <background>
   *     <image>http://mywebserver/imagename.png</image>
   *     <icon>http://mywebserver/imagethumbnail.png</icon>
   *   </background>
   * </setBackground>
   */
  CiscoSetBackground(image: string, thumbnail: string): string {
    return "<setBackground><background>" +
      this.xml("image", image) +
      this.xml("icon", thumbnail) +
      "</background></setBackground>";
  }


  /**
   * This function quotes a string according to Cisco's specifications
   */
  quote(text: string): string {
    return text.toString().replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&apos;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }


  /**
   * This function generates a XML tag and quotes the content. The subtag is not quoted and assumed to as already quoted
   */
  xml(tag: string, text: string, subtag?: string, attr?: string): string {
    return "<" + tag + (typeof attr !== 'undefined' ? " " + attr : "") + ">" + this.quote(text.toString()) + (typeof subtag !== "undefined" ? subtag : "") + "</" + tag + ">";
  }


  /**
   * Push an xml object to the given phone
   */
  push(vendor: string, host: string, xml: string, username: string, password: string): void {
    xml = "XML=" + encodeURIComponent(xml);
    // push object
    let options = {
        host: host,
        path: vendor === "Cisco" ? "/CGI/Execute" : "minibrowser.htm?",
        port: 80,
        method: "POST",
        auth: username + ":" + password,
        headers: {
            "Connection": "close",
            "Content-Type": "application/x-www-form-urlencoded",
            "Content-Length": xml.length
        }
    };
    let req = http.request(options, (response) => {
        let str = "";
        response.on("data", (chunk) => {
            str += chunk;
        });
        response.on("end", () => {
        });
    });
    req.write(xml);
    req.end();
  }
}
