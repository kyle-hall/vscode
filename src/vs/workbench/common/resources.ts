/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { URI } from 'vs/base/common/uri';
import * as paths from 'vs/base/common/paths';
import { RawContextKey, IContextKeyService, IContextKey } from 'vs/platform/contextkey/common/contextkey';
import { IModeService } from 'vs/editor/common/services/modeService';
import { IFileService } from 'vs/platform/files/common/files';
import { Disposable } from 'vs/base/common/lifecycle';
import { Schemas } from 'vs/base/common/network';

export class ResourceContextKey extends Disposable implements IContextKey<URI> {

	static Scheme = new RawContextKey<string>('resourceScheme', undefined);
	static Filename = new RawContextKey<string>('resourceFilename', undefined);
	static LangId = new RawContextKey<string>('resourceLangId', undefined);
	static Resource = new RawContextKey<URI>('resource', undefined);
	static Extension = new RawContextKey<string>('resourceExtname', undefined);
	static HasResource = new RawContextKey<boolean>('resourceSet', false);
	static IsFileSystemResource = new RawContextKey<boolean>('isFileSystemResource', false);
	static IsFileSystemResourceOrUntitled = new RawContextKey<boolean>('isFileSystemResourceOrUntitled', false);

	private _resourceKey: IContextKey<URI>;
	private _schemeKey: IContextKey<string>;
	private _filenameKey: IContextKey<string>;
	private _langIdKey: IContextKey<string>;
	private _extensionKey: IContextKey<string>;
	private _hasResource: IContextKey<boolean>;
	private _isfileSystemResource: IContextKey<boolean>;
	private _isFileSystemResourceOrUntitled: IContextKey<boolean>;

	constructor(
		@IContextKeyService contextKeyService: IContextKeyService,
		@IFileService private readonly _fileService: IFileService,
		@IModeService private readonly _modeService: IModeService
	) {
		super();

		this._schemeKey = ResourceContextKey.Scheme.bindTo(contextKeyService);
		this._filenameKey = ResourceContextKey.Filename.bindTo(contextKeyService);
		this._langIdKey = ResourceContextKey.LangId.bindTo(contextKeyService);
		this._resourceKey = ResourceContextKey.Resource.bindTo(contextKeyService);
		this._extensionKey = ResourceContextKey.Extension.bindTo(contextKeyService);
		this._hasResource = ResourceContextKey.HasResource.bindTo(contextKeyService);
		this._isfileSystemResource = ResourceContextKey.IsFileSystemResource.bindTo(contextKeyService);
		this._isFileSystemResourceOrUntitled = ResourceContextKey.IsFileSystemResourceOrUntitled.bindTo(contextKeyService);

		this._register(_fileService.onDidChangeFileSystemProviderRegistrations(() => {
			const resource = this._resourceKey.get();
			this._isfileSystemResource.set(resource && _fileService.canHandleResource(resource));
			this._isFileSystemResourceOrUntitled.set(this._isfileSystemResource.get() || this._schemeKey.get() === Schemas.untitled);
		}));
	}

	set(value: URI) {
		this._resourceKey.set(value);
		this._schemeKey.set(value && value.scheme);
		this._filenameKey.set(value && paths.basename(value.fsPath));
		this._langIdKey.set(value && this._modeService.getModeIdByFilepathOrFirstLine(value.fsPath));
		this._extensionKey.set(value && paths.extname(value.fsPath));
		this._hasResource.set(!!value);
		this._isfileSystemResource.set(value && this._fileService.canHandleResource(value));
		this._isFileSystemResourceOrUntitled.set(this._isfileSystemResource.get() || this._schemeKey.get() === Schemas.untitled);
	}

	reset(): void {
		this._schemeKey.reset();
		this._langIdKey.reset();
		this._resourceKey.reset();
		this._langIdKey.reset();
		this._extensionKey.reset();
		this._hasResource.reset();
	}

	get(): URI {
		return this._resourceKey.get();
	}
}

/**
 * Data URI related helpers.
 */
export namespace DataUri {

	export const META_DATA_LABEL = 'label';
	export const META_DATA_DESCRIPTION = 'description';
	export const META_DATA_SIZE = 'size';
	export const META_DATA_MIME = 'mime';

	export function parseMetaData(dataUri: URI): Map<string, string> {
		const metadata = new Map<string, string>();

		// Given a URI of:  data:image/png;size:2313;label:SomeLabel;description:SomeDescription;base64,77+9UE5...
		// the metadata is: size:2313;label:SomeLabel;description:SomeDescription
		const meta = dataUri.path.substring(dataUri.path.indexOf(';') + 1, dataUri.path.lastIndexOf(';'));
		meta.split(';').forEach(property => {
			const [key, value] = property.split(':');
			if (key && value) {
				metadata.set(key, value);
			}
		});

		// Given a URI of:  data:image/png;size:2313;label:SomeLabel;description:SomeDescription;base64,77+9UE5...
		// the mime is: image/png
		const mime = dataUri.path.substring(0, dataUri.path.indexOf(';'));
		if (mime) {
			metadata.set(META_DATA_MIME, mime);
		}

		return metadata;
	}
}
