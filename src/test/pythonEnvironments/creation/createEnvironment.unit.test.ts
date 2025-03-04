// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
/* eslint-disable @typescript-eslint/no-explicit-any */

import * as chaiAsPromised from 'chai-as-promised';
import * as sinon from 'sinon';
import * as typemoq from 'typemoq';
import { assert, use as chaiUse } from 'chai';
import * as windowApis from '../../../client/common/vscodeApis/windowApis';
import { handleCreateEnvironmentCommand } from '../../../client/pythonEnvironments/creation/createEnvironment';
import { CreateEnvironmentProvider } from '../../../client/pythonEnvironments/creation/types';
import { IDisposableRegistry } from '../../../client/common/types';
import { onCreateEnvironmentStarted } from '../../../client/pythonEnvironments/creation/createEnvApi';

chaiUse(chaiAsPromised);

suite('Create Environments Tests', () => {
    let showQuickPickStub: sinon.SinonStub;
    const disposables: IDisposableRegistry = [];
    let startedEventTriggered = false;
    let exitedEventTriggered = false;

    setup(() => {
        showQuickPickStub = sinon.stub(windowApis, 'showQuickPick');
        startedEventTriggered = false;
        exitedEventTriggered = false;
        disposables.push(
            onCreateEnvironmentStarted(() => {
                startedEventTriggered = true;
            }),
        );
        disposables.push(
            onCreateEnvironmentStarted(() => {
                exitedEventTriggered = true;
            }),
        );
    });

    teardown(() => {
        sinon.restore();
        disposables.forEach((d) => d.dispose());
    });

    test('Successful environment creation', async () => {
        const provider = typemoq.Mock.ofType<CreateEnvironmentProvider>();
        provider.setup((p) => p.name).returns(() => 'test');
        provider.setup((p) => p.id).returns(() => 'test-id');
        provider.setup((p) => p.description).returns(() => 'test-description');
        provider.setup((p) => p.createEnvironment(typemoq.It.isAny())).returns(() => Promise.resolve(undefined));
        provider.setup((p) => (p as any).then).returns(() => undefined);

        showQuickPickStub.resolves(provider.object);

        await handleCreateEnvironmentCommand([provider.object]);

        assert.isTrue(startedEventTriggered);
        assert.isTrue(exitedEventTriggered);
        provider.verifyAll();
    });

    test('Environment creation error', async () => {
        const provider = typemoq.Mock.ofType<CreateEnvironmentProvider>();
        provider.setup((p) => p.name).returns(() => 'test');
        provider.setup((p) => p.id).returns(() => 'test-id');
        provider.setup((p) => p.description).returns(() => 'test-description');
        provider.setup((p) => p.createEnvironment(typemoq.It.isAny())).returns(() => Promise.reject());
        provider.setup((p) => (p as any).then).returns(() => undefined);

        await assert.isRejected(handleCreateEnvironmentCommand([provider.object]));

        assert.isTrue(startedEventTriggered);
        assert.isTrue(exitedEventTriggered);
        provider.verifyAll();
    });

    test('No providers registered', async () => {
        await handleCreateEnvironmentCommand([]);

        assert.isTrue(showQuickPickStub.notCalled);
        assert.isFalse(startedEventTriggered);
        assert.isFalse(exitedEventTriggered);
    });

    test('Single environment creation provider registered', async () => {
        const provider = typemoq.Mock.ofType<CreateEnvironmentProvider>();
        provider.setup((p) => p.name).returns(() => 'test');
        provider.setup((p) => p.id).returns(() => 'test-id');
        provider.setup((p) => p.description).returns(() => 'test-description');
        provider.setup((p) => p.createEnvironment(typemoq.It.isAny())).returns(() => Promise.resolve(undefined));
        provider.setup((p) => (p as any).then).returns(() => undefined);

        await handleCreateEnvironmentCommand([provider.object]);

        assert.isTrue(showQuickPickStub.notCalled);
        assert.isTrue(startedEventTriggered);
        assert.isTrue(exitedEventTriggered);
    });

    test('Multiple environment creation providers registered', async () => {
        const provider1 = typemoq.Mock.ofType<CreateEnvironmentProvider>();
        provider1.setup((p) => p.name).returns(() => 'test1');
        provider1.setup((p) => p.id).returns(() => 'test-id1');
        provider1.setup((p) => p.description).returns(() => 'test-description1');
        provider1.setup((p) => p.createEnvironment(typemoq.It.isAny())).returns(() => Promise.resolve(undefined));

        const provider2 = typemoq.Mock.ofType<CreateEnvironmentProvider>();
        provider2.setup((p) => p.name).returns(() => 'test2');
        provider2.setup((p) => p.id).returns(() => 'test-id2');
        provider2.setup((p) => p.description).returns(() => 'test-description2');
        provider2.setup((p) => p.createEnvironment(typemoq.It.isAny())).returns(() => Promise.resolve(undefined));

        showQuickPickStub.resolves({
            id: 'test-id2',
            label: 'test2',
            description: 'test-description2',
        });

        provider1.setup((p) => (p as any).then).returns(() => undefined);
        provider2.setup((p) => (p as any).then).returns(() => undefined);
        await handleCreateEnvironmentCommand([provider1.object, provider2.object]);

        assert.isTrue(showQuickPickStub.calledOnce);
        assert.isTrue(startedEventTriggered);
        assert.isTrue(exitedEventTriggered);
    });
});
