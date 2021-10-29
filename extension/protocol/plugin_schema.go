// Code generated by github.com/atombender/go-jsonschema, DO NOT EDIT.

package protocol

import "fmt"
import "reflect"
import "encoding/json"

// UnmarshalJSON implements json.Unmarshaler.
func (j *TemplateTextBlockAlign) UnmarshalJSON(b []byte) error {
	var v string
	if err := json.Unmarshal(b, &v); err != nil {
		return err
	}
	var ok bool
	for _, expected := range enumValues_TemplateTextBlockAlign {
		if reflect.DeepEqual(v, expected) {
			ok = true
			break
		}
	}
	if !ok {
		return fmt.Errorf("invalid value (expected one of %#v): %#v", enumValues_TemplateTextBlockAlign, v)
	}
	*j = TemplateTextBlockAlign(v)
	return nil
}

// UnmarshalJSON implements json.Unmarshaler.
func (j *Source) UnmarshalJSON(b []byte) error {
	var v string
	if err := json.Unmarshal(b, &v); err != nil {
		return err
	}
	var ok bool
	for _, expected := range enumValues_Source {
		if reflect.DeepEqual(v, expected) {
			ok = true
			break
		}
	}
	if !ok {
		return fmt.Errorf("invalid value (expected one of %#v): %#v", enumValues_Source, v)
	}
	*j = Source(v)
	return nil
}

// UnmarshalJSON implements json.Unmarshaler.
func (j *Action) UnmarshalJSON(b []byte) error {
	var v string
	if err := json.Unmarshal(b, &v); err != nil {
		return err
	}
	var ok bool
	for _, expected := range enumValues_Action {
		if reflect.DeepEqual(v, expected) {
			ok = true
			break
		}
	}
	if !ok {
		return fmt.Errorf("invalid value (expected one of %#v): %#v", enumValues_Action, v)
	}
	*j = Action(v)
	return nil
}

const ActionUNSPECIFIEDACTION Action = "UNSPECIFIED_ACTION"
const ActionADD Action = "ADD"
const ActionMODIFY Action = "MODIFY"
const ActionREMOVE Action = "REMOVE"
const ActionCREATEFILE Action = "CREATE_FILE"

type Action string

const ActionDELETEFILE Action = "DELETE_FILE"

// The action that caused the change.
type ChangeAction interface{}

type ChangeDetail map[string]interface{}

// The surface in the client where the change originated.
type ChangeSource interface{}

// Represents a single change to a single file in the client that the plugin may
// react to.
type Change struct {
	// The action that caused the change.
	Action ChangeAction `json:"action,omitempty"`

	// Detail corresponds to the JSON schema field "detail".
	Detail ChangeDetail `json:"detail,omitempty"`

	// The path to the file that changed.
	FilePath *string `json:"filePath,omitempty"`

	// The surface in the client where the change originated.
	Source ChangeSource `json:"source,omitempty"`
}

type ClientCapabilities map[string]interface{}

type Diagram struct {
	// Content corresponds to the JSON schema field "content".
	Content *DiagramData `json:"content,omitempty"`

	// Type corresponds to the JSON schema field "type".
	Type *DiagramDescriptor `json:"type,omitempty"`
}

const ActionSAVEFILE Action = "SAVE_FILE"

type DiagramCapabilitiesAvailabilitiesElem struct {
	// Whether this diagram type is available from this plugin.
	Available *bool `json:"available,omitempty"`

	// If not available, the reason why.
	Reason *string `json:"reason,omitempty"`

	// Type corresponds to the JSON schema field "type".
	Type *DiagramDescriptor `json:"type,omitempty"`
}

type Context struct {
	// The content of the focused file.
	FileContent *string `json:"fileContent,omitempty"`

	// The path to the client's currently focused file.
	FilePath *string `json:"filePath,omitempty"`

	// The specific position on which the client is focused.
	Focus *Position `json:"focus,omitempty"`

	// The Sysl module encoded in the focused file.
	Module *Module `json:"module,omitempty"`

	// The state of relevant settings in the client.
	Settings Settings `json:"settings,omitempty"`

	// The path to the Sysl root.
	SyslRoot *string `json:"syslRoot,omitempty"`

	// The ID of the view where the change occurred.
	ViewId *string `json:"viewId,omitempty"`
}

type DiagramCapabilities struct {
	// Availabilities corresponds to the JSON schema field "availabilities".
	Availabilities []DiagramCapabilitiesAvailabilitiesElem `json:"availabilities,omitempty"`
}

// The content of a diagram.
type DiagramData struct {
	// Edges corresponds to the JSON schema field "edges".
	Edges []Edge `json:"edges,omitempty"`

	// Nodes corresponds to the JSON schema field "nodes".
	Nodes []Node `json:"nodes,omitempty"`

	// Templates corresponds to the JSON schema field "templates".
	Templates *TemplateData `json:"templates,omitempty"`
}

type DiagramDescriptor struct {
	// Description corresponds to the JSON schema field "description".
	Description *string `json:"description,omitempty"`

	// Icon corresponds to the JSON schema field "icon".
	Icon *string `json:"icon,omitempty"`

	// Id corresponds to the JSON schema field "id".
	Id *string `json:"id,omitempty"`

	// Name corresponds to the JSON schema field "name".
	Name *string `json:"name,omitempty"`
}

type Edge map[string]interface{}

type Error struct {
	// Code corresponds to the JSON schema field "code".
	Code *int `json:"code,omitempty"`

	// Data corresponds to the JSON schema field "data".
	Data ErrorData `json:"data,omitempty"`

	// Message corresponds to the JSON schema field "message".
	Message *string `json:"message,omitempty"`
}

type ErrorData map[string]interface{}

type InitializeRequest struct {
	// Capabilities corresponds to the JSON schema field "capabilities".
	Capabilities InitializeRequestCapabilities `json:"capabilities,omitempty"`
}

type InitializeRequestCapabilities map[string]interface{}

type InitializeResponse struct {
	// Capabilities corresponds to the JSON schema field "capabilities".
	Capabilities *ServerCapabilities `json:"capabilities,omitempty"`
}

type Module string

type Node map[string]interface{}

type OnChangeRequest struct {
	// Change corresponds to the JSON schema field "change".
	Change *Change `json:"change,omitempty"`

	// Context corresponds to the JSON schema field "context".
	Context *Context `json:"context,omitempty"`
}

type OnChangeResponse struct {
	// RenderDiagram corresponds to the JSON schema field "renderDiagram".
	RenderDiagram []Diagram `json:"renderDiagram,omitempty"`
}

// A position within a Sysl spec.
type Position struct {
	// Anno corresponds to the JSON schema field "anno".
	Anno *string `json:"anno,omitempty"`

	// App corresponds to the JSON schema field "app".
	App []string `json:"app,omitempty"`

	// Endpoint corresponds to the JSON schema field "endpoint".
	Endpoint *string `json:"endpoint,omitempty"`

	// Field corresponds to the JSON schema field "field".
	Field *string `json:"field,omitempty"`

	// Param corresponds to the JSON schema field "param".
	Param *string `json:"param,omitempty"`

	// Src corresponds to the JSON schema field "src".
	Src *string `json:"src,omitempty"`

	// Stmt corresponds to the JSON schema field "stmt".
	Stmt *string `json:"stmt,omitempty"`

	// Tag corresponds to the JSON schema field "tag".
	Tag *string `json:"tag,omitempty"`

	// Type corresponds to the JSON schema field "type".
	Type *string `json:"type,omitempty"`
}

// General wrapper for all responses.
type Request struct {
	// Initialize corresponds to the JSON schema field "initialize".
	Initialize *InitializeRequest `json:"initialize,omitempty"`

	// Onchange corresponds to the JSON schema field "onchange".
	Onchange *OnChangeRequest `json:"onchange,omitempty"`
}

// General wrapper for all responses.
type Response struct {
	// Error corresponds to the JSON schema field "error".
	Error *Error `json:"error,omitempty"`

	// Initialize corresponds to the JSON schema field "initialize".
	Initialize *InitializeResponse `json:"initialize,omitempty"`

	// Onchange corresponds to the JSON schema field "onchange".
	Onchange *OnChangeResponse `json:"onchange,omitempty"`
}

type ServerCapabilities struct {
	// Diagrams corresponds to the JSON schema field "diagrams".
	Diagrams *DiagramCapabilities `json:"diagrams,omitempty"`
}

type Settings map[string]interface{}

type Source string

const SourceCUSTOM Source = "CUSTOM"
const SourceDIAGRAM Source = "DIAGRAM"
const SourceTEXT Source = "TEXT"
const SourceUNSPECIFIEDSOURCE Source = "UNSPECIFIED_SOURCE"

type TemplateData struct {
	// DiagramLabel corresponds to the JSON schema field "diagramLabel".
	DiagramLabel *string `json:"diagramLabel,omitempty"`

	// DiagramLayout corresponds to the JSON schema field "diagramLayout".
	DiagramLayout TemplateLayoutData `json:"diagramLayout,omitempty"`

	// Edges corresponds to the JSON schema field "edges".
	Edges TemplateDataEdges `json:"edges,omitempty"`

	// Groups corresponds to the JSON schema field "groups".
	Groups TemplateDataGroups `json:"groups,omitempty"`

	// Nodes corresponds to the JSON schema field "nodes".
	Nodes TemplateDataNodes `json:"nodes,omitempty"`
}

type TemplateDataEdges map[string]TemplateEdgeData

type TemplateDataGroups map[string]TemplateGroupData

type TemplateDataNodes map[string]TemplateNodeData

type TemplateEdgeData struct {
	// ArrowShape corresponds to the JSON schema field "arrowShape".
	ArrowShape *TemplateShape `json:"arrowShape,omitempty"`

	// Corner corresponds to the JSON schema field "corner".
	Corner *int `json:"corner,omitempty"`

	// PathShape corresponds to the JSON schema field "pathShape".
	PathShape *TemplateShape `json:"pathShape,omitempty"`

	// Text corresponds to the JSON schema field "text".
	Text *TemplateTextBlock `json:"text,omitempty"`
}

type TemplateGroupData struct {
	// Collapsed corresponds to the JSON schema field "collapsed".
	Collapsed []TemplateSectionData `json:"collapsed,omitempty"`

	// Expanded corresponds to the JSON schema field "expanded".
	Expanded []TemplateSectionData `json:"expanded,omitempty"`

	// Shadow corresponds to the JSON schema field "shadow".
	Shadow *TemplateShadowData `json:"shadow,omitempty"`
}

type TemplateLayoutData map[string]interface{}

type TemplateNodeData struct {
	// Sections corresponds to the JSON schema field "sections".
	Sections []TemplateSectionData `json:"sections,omitempty"`

	// Shadow corresponds to the JSON schema field "shadow".
	Shadow *TemplateShadowData `json:"shadow,omitempty"`
}

type TemplateSectionData struct {
	// Background corresponds to the JSON schema field "background".
	Background *string `json:"background,omitempty"`

	// DesiredSize corresponds to the JSON schema field "desiredSize".
	DesiredSize TemplateSectionDataDesiredSize `json:"desiredSize,omitempty"`

	// Height corresponds to the JSON schema field "height".
	Height *int `json:"height,omitempty"`

	// MainPanel corresponds to the JSON schema field "mainPanel".
	MainPanel *bool `json:"mainPanel,omitempty"`

	// MinSize corresponds to the JSON schema field "minSize".
	MinSize TemplateSectionDataMinSize `json:"minSize,omitempty"`

	// Padding corresponds to the JSON schema field "padding".
	Padding *int `json:"padding,omitempty"`

	// PanelType corresponds to the JSON schema field "panelType".
	PanelType *string `json:"panelType,omitempty"`

	// Sections corresponds to the JSON schema field "sections".
	Sections []*TemplateSectionData `json:"sections,omitempty"`

	// Shape corresponds to the JSON schema field "shape".
	Shape *TemplateShape `json:"shape,omitempty"`

	// Stretch corresponds to the JSON schema field "stretch".
	Stretch *bool `json:"stretch,omitempty"`

	// Text corresponds to the JSON schema field "text".
	Text *TemplateTextBlock `json:"text,omitempty"`

	// Width corresponds to the JSON schema field "width".
	Width *int `json:"width,omitempty"`
}

type TemplateSectionDataDesiredSize map[string]int

type TemplateSectionDataMinSize map[string]int

type TemplateShadowData struct {
	// ShadowBlur corresponds to the JSON schema field "shadowBlur".
	ShadowBlur *int `json:"shadowBlur,omitempty"`

	// ShadowColor corresponds to the JSON schema field "shadowColor".
	ShadowColor *string `json:"shadowColor,omitempty"`

	// ShadowOffset corresponds to the JSON schema field "shadowOffset".
	ShadowOffset TemplateShadowDataShadowOffset `json:"shadowOffset,omitempty"`
}

type TemplateShadowDataShadowOffset map[string]int

type TemplateShape struct {
	// Fill corresponds to the JSON schema field "fill".
	Fill *string `json:"fill,omitempty"`

	// ShapeType corresponds to the JSON schema field "shapeType".
	ShapeType *string `json:"shapeType,omitempty"`

	// Stroke corresponds to the JSON schema field "stroke".
	Stroke *string `json:"stroke,omitempty"`

	// StrokeWidth corresponds to the JSON schema field "strokeWidth".
	StrokeWidth *int `json:"strokeWidth,omitempty"`

	// ToArrow corresponds to the JSON schema field "toArrow".
	ToArrow *string `json:"toArrow,omitempty"`
}

type TemplateTextBlock struct {
	// Align corresponds to the JSON schema field "align".
	Align *TemplateTextBlockAlign `json:"align,omitempty"`

	// Font corresponds to the JSON schema field "font".
	Font *string `json:"font,omitempty"`

	// Label corresponds to the JSON schema field "label".
	Label *string `json:"label,omitempty"`

	// Margin corresponds to the JSON schema field "margin".
	Margin *string `json:"margin,omitempty"`

	// MaxLines corresponds to the JSON schema field "maxLines".
	MaxLines *int `json:"maxLines,omitempty"`

	// SegmentOffset corresponds to the JSON schema field "segmentOffset".
	SegmentOffset TemplateTextBlockSegmentOffset `json:"segmentOffset,omitempty"`

	// Stretch corresponds to the JSON schema field "stretch".
	Stretch *bool `json:"stretch,omitempty"`

	// Stroke corresponds to the JSON schema field "stroke".
	Stroke *string `json:"stroke,omitempty"`
}

type TemplateTextBlockAlign string

const TemplateTextBlockAlignCenter TemplateTextBlockAlign = "center"
const TemplateTextBlockAlignEnd TemplateTextBlockAlign = "end"
const TemplateTextBlockAlignLeft TemplateTextBlockAlign = "left"
const TemplateTextBlockAlignRight TemplateTextBlockAlign = "right"
const TemplateTextBlockAlignStart TemplateTextBlockAlign = "start"

type TemplateTextBlockSegmentOffset map[string]int

var enumValues_Action = []interface{}{
	"UNSPECIFIED_ACTION",
	"ADD",
	"MODIFY",
	"REMOVE",
	"CREATE_FILE",
	"SAVE_FILE",
	"DELETE_FILE",
}
var enumValues_Source = []interface{}{
	"UNSPECIFIED_SOURCE",
	"TEXT",
	"DIAGRAM",
	"CUSTOM",
}
var enumValues_TemplateTextBlockAlign = []interface{}{
	"start",
	"end",
	"left",
	"right",
	"center",
}
